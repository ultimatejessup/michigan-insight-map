/**
 * Browser-only text extraction for the Bill Explainer.
 *
 * The visitor's file is read here, on their device. PDFs with a text layer are read directly;
 * photos and scanned PDFs are read with OCR. OCR files are served from this site (/ocr) so no
 * third party sees anything. Libraries are imported lazily so server rendering never loads them.
 */

export type ExtractMethod = "pdf-text" | "pdf-ocr" | "image-ocr";

export interface ExtractedBill {
  text: string;
  method: ExtractMethod;
  pages: number;
  truncated: boolean;
}

export type Progress = (message: string, fraction?: number) => void;

export const MAX_PAGES = 8;

/** Small fallbacks for newer JavaScript features the PDF reader uses and some phones lack. */
export function installBrowserFallbacks(): void {
  const P = Promise as any;
  if (typeof P.withResolvers !== "function") {
    P.withResolvers = function () {
      let resolve!: (v?: unknown) => void;
      let reject!: (r?: unknown) => void;
      const promise = new P((res: any, rej: any) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
  for (const M of [Map, WeakMap] as any[]) {
    const proto = M?.prototype;
    if (proto && typeof proto.getOrInsertComputed !== "function") {
      proto.getOrInsertComputed = function (key: unknown, compute: (k: unknown) => unknown) {
        if (!this.has(key)) this.set(key, compute(key));
        return this.get(key);
      };
    }
    if (proto && typeof proto.getOrInsert !== "function") {
      proto.getOrInsert = function (key: unknown, value: unknown) {
        if (!this.has(key)) this.set(key, value);
        return this.get(key);
      };
    }
  }
}
const MIN_CHARS_PER_PAGE = 40;

interface PositionedItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Rebuild reading-order lines from positioned PDF text. Wide gaps become two spaces (columns). */
function itemsToText(items: PositionedItem[]): string {
  const rows: { y: number; items: PositionedItem[] }[] = [];
  for (const it of items) {
    if (!it.str.trim()) continue;
    const tol = Math.max(2, it.height * 0.5);
    const row = rows.find((r) => Math.abs(r.y - it.y) <= tol);
    if (row) row.items.push(it);
    else rows.push({ y: it.y, items: [it] });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows
    .map((row) => {
      row.items.sort((a, b) => a.x - b.x);
      let line = "";
      let prevEnd: number | null = null;
      for (const it of row.items) {
        if (prevEnd !== null) {
          const gap = it.x - prevEnd;
          const h = Math.max(it.height, 6);
          line += gap > h * 1.5 ? "  " : gap > h * 0.15 ? " " : "";
        }
        line += it.str;
        prevEnd = it.x + it.width;
      }
      return line.trimEnd();
    })
    .join("\n");
}

type TesseractWorker = Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>;

async function createOcrWorker(onProgress?: Progress): Promise<TesseractWorker> {
  const { createWorker } = await import("tesseract.js");
  const base = `${window.location.origin}/ocr`;
  return createWorker("eng", 1, {
    workerPath: `${base}/worker.min.js`,
    corePath: `${base}/tesseract-core-simd-lstm.wasm.js`,
    langPath: base,
    logger: (m: { status?: string; progress?: number }) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.("Reading the text in your photo…", m.progress);
      }
    },
  });
}

async function ocrCanvases(
  canvases: (HTMLCanvasElement | HTMLImageElement | ImageBitmap)[],
  onProgress?: Progress,
): Promise<string> {
  onProgress?.("Loading the on-device text reader (first time only)…");
  const worker = await createOcrWorker(onProgress);
  try {
    const parts: string[] = [];
    for (const c of canvases) {
      const { data } = await worker.recognize(c as HTMLCanvasElement);
      parts.push(data.text);
    }
    return parts.join("\n\n");
  } finally {
    await worker.terminate();
  }
}

async function extractPdf(file: File, onProgress?: Progress): Promise<ExtractedBill> {
  onProgress?.("Opening your PDF on this device…");
  installBrowserFallbacks();
  // The "legacy" build includes fallbacks for newer browser features that many phones lack.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerUrl = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data });
  const doc = await task.promise;
  const pages = Math.min(doc.numPages, MAX_PAGES);
  const truncated = doc.numPages > MAX_PAGES;

  const pageTexts: string[] = [];
  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: PositionedItem[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const [, , , d, e, f] = item.transform as number[];
      items.push({
        str: item.str,
        x: e ?? 0,
        y: f ?? 0,
        width: item.width,
        height: item.height || Math.abs(d ?? 0),
      });
    }
    pageTexts.push(itemsToText(items));
    onProgress?.("Reading your PDF…", p / pages);
  }

  const text = pageTexts.join("\n\n").trim();
  if (text.length >= MIN_CHARS_PER_PAGE * pages) {
    await task.destroy();
    return { text, method: "pdf-text", pages, truncated };
  }

  // Scanned PDF with no text layer: draw each page and read it with OCR.
  const canvases: HTMLCanvasElement[] = [];
  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't draw the PDF for reading.");
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    canvases.push(canvas);
  }
  await task.destroy();
  const ocrText = (await ocrCanvases(canvases, onProgress)).trim();
  return { text: ocrText, method: "pdf-ocr", pages, truncated };
}

/** Decode a photo. Some phone browsers lack createImageBitmap options or reject certain files. */
async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  try {
    const bmp = await createImageBitmap(file);
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function extractImage(file: File, onProgress?: Progress): Promise<ExtractedBill> {
  const bitmap = await loadImage(file);
  try {
    const canvas = document.createElement("canvas");
    // Upscale small photos a little; downscale huge ones to keep OCR fast.
    const longSide = Math.max(bitmap.width, bitmap.height);
    const scale = longSide < 1600 ? 1600 / longSide : longSide > 3200 ? 3200 / longSide : 1;
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't draw the photo for reading.");
    ctx.drawImage(bitmap.source, 0, 0, canvas.width, canvas.height);
    const text = (await ocrCanvases([canvas], onProgress)).trim();
    return { text, method: "image-ocr", pages: 1, truncated: false };
  } finally {
    bitmap.close();
  }
}

/** Phones often give PDFs an empty or wrong type, so check the file's first bytes too. */
async function looksLikePdf(file: File): Promise<boolean> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return true;
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head) === "%PDF-";
}

export async function extractBillText(file: File, onProgress?: Progress): Promise<ExtractedBill> {
  if (await looksLikePdf(file)) return extractPdf(file, onProgress);
  return extractImage(file, onProgress);
}
