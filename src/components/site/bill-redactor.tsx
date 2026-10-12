import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Eraser, Undo2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type Box = { x: number; y: number; w: number; h: number };
const MAX_SIDE = 2000;

/**
 * Local, in-browser redaction. The original photo never leaves the device;
 * only the blacked-out copy is exported through onChange.
 */
export function BillRedactor({
  onChange,
  disabled,
}: {
  onChange: (redacted: File | null) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [draft, setDraft] = useState<Box | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const start = useRef<{ x: number; y: number } | null>(null);

  const scale = img ? Math.min(1, MAX_SIDE / Math.max(img.width, img.height)) : 1;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !img) return;
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    ctx.fillStyle = "#000";
    for (const b of draft ? [...boxes, draft] : boxes) ctx.fillRect(b.x, b.y, b.w, b.h);
  }, [img, boxes, draft, scale]);

  // Export only after the person confirms; any edit un-confirms.
  useEffect(() => {
    if (!confirmed || !img || !canvasRef.current) {
      onChange(null);
      return;
    }
    canvasRef.current.toBlob((blob) => {
      onChange(blob ? new File([blob], "bill-redacted.png", { type: "image/png" }) : null);
    }, "image/png");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, boxes, img]);

  const pick = (file: File | undefined) => {
    setError("");
    setBoxes([]);
    setConfirmed(false);
    if (!file) return setImg(null);
    if (!file.type.startsWith("image/")) {
      setImg(null);
      setError("Please use a photo or screenshot (JPG, PNG or WebP) so you can cover personal details.");
      return;
    }
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => setImg(el);
    el.onerror = () => setError("We couldn't open that image.");
    el.src = url;
  };

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * e.currentTarget.width,
      y: ((e.clientY - r.top) / r.height) * e.currentTarget.height,
    };
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = point(e);
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!start.current) return;
    const p = point(e);
    const s = start.current;
    setDraft({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };
  const up = () => {
    if (draft && draft.w > 4 && draft.h > 4) {
      setBoxes((b) => [...b, draft]);
      setConfirmed(false);
    }
    setDraft(null);
    start.current = null;
  };

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-surface px-4 py-6 text-center hover:border-primary">
        <Upload className="h-7 w-7 text-primary" aria-hidden="true" />
        <span className="font-semibold">{img ? "Choose a different photo" : "Choose a photo or screenshot of your bill"}</span>
        <span className="text-sm text-muted-foreground">JPG, PNG or WebP. Got a PDF? Take a screenshot of it.</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </label>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      {img ? (
        <>
          <p className="rounded-md border-l-4 border-accent bg-surface p-3 text-sm">
            <strong>Cover your personal details:</strong> drag across your name, address, account
            number, phone, email and any barcode or QR code to black them out. This happens on your
            device — the uncovered photo is never sent.
          </p>
          <canvas
            ref={canvasRef}
            aria-label="Your bill. Drag to draw black boxes over personal information."
            className="w-full touch-none cursor-crosshair rounded-md border"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outlinePrimary" size="sm" disabled={!boxes.length || disabled}
              onClick={() => { setBoxes((b) => b.slice(0, -1)); setConfirmed(false); }}>
              <Undo2 aria-hidden="true" /> Undo box
            </Button>
            <Button type="button" variant="outlinePrimary" size="sm" disabled={!boxes.length || disabled}
              onClick={() => { setBoxes([]); setConfirmed(false); }}>
              <Eraser aria-hidden="true" /> Clear all
            </Button>
            <span className="self-center text-sm text-muted-foreground">{boxes.length} area(s) covered</span>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox className="mt-0.5" checked={confirmed} disabled={disabled || !boxes.length}
              onCheckedChange={(v) => setConfirmed(v === true)} />
            <span>I have covered my name, address, account number and other personal details.</span>
          </label>
        </>
      ) : null}
    </div>
  );
}
