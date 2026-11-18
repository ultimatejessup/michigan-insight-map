// On-device bill reader. Takes the text of a bill (already on the visitor's device) and returns
// what is printed on it: line items with amounts, plus plain-language meanings from the reviewed
// glossary. Nothing is sent anywhere, nothing is estimated, and amounts are never added up:
// every figure shown is a figure that appears on the bill.

import { lookupCharge, type GlossaryEntry, type UtilityKind } from "./glossary";

export type LineItem = {
  /** Label as printed, cleaned of usage math. */
  label: string;
  /** Amount as printed, for example "$8.50" or "-$140.55". */
  amount: string;
  /** True for credits, payments and negative amounts. */
  isCredit: boolean;
  entry: GlossaryEntry | null;
};

export type Flag = {
  id: string;
  title: string;
  why: string;
  question: string;
  /** The line it came from, when there is one. */
  label?: string;
  amount?: string;
};

export type BillAnalysis = {
  utility: UtilityKind;
  totalDue: string | null;
  dueDate: string | null;
  period: string | null;
  items: LineItem[];
  /** Line items whose label is not in the glossary. */
  unrecognized: LineItem[];
  flags: Flag[];
  /** Questions to read aloud to the provider. */
  questions: string[];
};

const MONEY =
  /(?:-\s*)?\(?\$\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})(?!\d)\)?(?:\s*(?:CR|cr))?|(?:-\s*)?\(?\d{1,3}(?:,\d{3})*\.\d{2}(?!\d)\)?(?:\s*(?:CR|cr))?/g;

const TOTAL_LABEL =
  /(total (amount )?due|amount due|balance due|total balance|please pay|pay this amount|total (current )?charges|total new charges|new charges|current charges|total bill|subtotal|total service|total for|service total|total electric|total gas|total water)/i;

const NOT_A_CHARGE =
  /(account|statement date|meter|reading|read date|service address|phone|questions|call |pay by|due date|payment due|billing period|service period|days in|kwh used|ccf used|therms? used)/i;

function normalizeAmount(raw: string): { text: string; negative: boolean } {
  const trimmed = raw.replace(/\s+/g, "");
  const negative = /^-/.test(trimmed) || /^\(.*\)$/.test(trimmed) || /cr$/i.test(trimmed);
  const digits = trimmed.replace(/[()-]|cr$/gi, "").replace(/^\$/, "");
  return { text: `${negative ? "-" : ""}$${digits}`, negative };
}

/** Removes usage math ("612 kWh x $0.0820", "30 days") from the front of a line's label. */
function cleanLabel(raw: string): string {
  return raw
    .replace(/\d[\d,.]*\s*(kwh|ccf|mcf|therms?|gal(lons)?|days?|cu\.? ?ft|units?)\b.*$/i, "")
    .replace(/[@x×]\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[:.\-–\s]+$/g, "")
    .trim();
}

function detectUtility(text: string): UtilityKind {
  const t = text.toLowerCase();
  const score = {
    electric: (t.match(/\bkwh\b|kilowatt|\bpscr\b|power supply|electric/g) ?? []).length,
    gas: (t.match(/\bccf\b|\bmcf\b|\btherms?\b|gas cost|natural gas|\bgcr\b/g) ?? []).length,
    water: (
      t.match(/\bgallons?\b|\bsewer\b|wastewater|water (usage|service)|stormwater|drainage/g) ?? []
    ).length,
    internet: (t.match(/\bmbps\b|\binternet\b|\bmodem\b|\bbroadband\b|\bwi-?fi\b/g) ?? []).length,
  };
  let best: UtilityKind = "unknown";
  let top = 0;
  for (const [k, v] of Object.entries(score) as [Exclude<UtilityKind, "unknown">, number][]) {
    if (v > top) {
      best = k;
      top = v;
    }
  }
  return best;
}

const DATE = String.raw`(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?)`;

function findDueDate(text: string): string | null {
  const m = new RegExp(
    `(?:due date|payment due|due by|pay by|due on|due)[^\\n\\d]{0,20}(${DATE})`,
    "i",
  ).exec(text);
  return m ? m[1]!.trim() : null;
}

function findPeriod(text: string): string | null {
  const m = new RegExp(
    `(?:service period|billing period|period|from)[^\\n\\d]{0,12}(${DATE})\\s*(?:-|–|to|through|thru)\\s*(${DATE})`,
    "i",
  ).exec(text);
  return m ? `${m[1]!.trim()} to ${m[2]!.trim()}` : null;
}

function findTotalDue(lines: string[]): string | null {
  for (const line of lines) {
    if (
      /(total amount due|amount due|balance due|please pay|pay this amount|total due)/i.test(line)
    ) {
      const amounts = line.match(MONEY);
      if (amounts?.length) return normalizeAmount(amounts[amounts.length - 1]!).text;
    }
  }
  return null;
}

const PAIR = new RegExp(String.raw`([A-Za-z][A-Za-z0-9 ,()/&.'’-]{2,}?):\s*(${MONEY.source})`, "g");

/**
 * A line is usually "label ... amount". Some bills put several "label: amount" pairs on one line
 * (for example a balance summary); those are split so each amount keeps its own label.
 */
function itemsFromLine(line: string): { label: string; amountRaw: string }[] {
  const pairs = [...line.matchAll(PAIR)];
  if (pairs.length >= 2) {
    return pairs.map((m) => ({ label: cleanLabel(m[1]!), amountRaw: m[2]! }));
  }
  const amounts = line.match(MONEY);
  if (!amounts?.length) return [];
  const first = line.search(MONEY);
  return [{ label: cleanLabel(line.slice(0, first)), amountRaw: amounts[amounts.length - 1]! }];
}

export function analyzeBill(text: string): BillAnalysis {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const utility = detectUtility(text);
  const items: LineItem[] = [];
  const flags: Flag[] = [];
  const seenFlags = new Set<string>();

  for (const line of lines) {
    // Estimated reads are noted even when the line has no amount.
    if (
      /estimated (read|reading|usage|meter)|\bestimated\b.*\bread/i.test(line) &&
      !seenFlags.has("estimated-read")
    ) {
      const entry = lookupCharge("estimated reading");
      if (entry?.askAbout) {
        seenFlags.add("estimated-read");
        flags.push({
          id: entry.id,
          title: entry.title,
          why: entry.askAbout,
          question: entry.question ?? "",
        });
      }
    }

    for (const { label, amountRaw } of itemsFromLine(line)) {
      if (label.replace(/[^a-z]/gi, "").length < 3) continue;
      if (TOTAL_LABEL.test(label) || NOT_A_CHARGE.test(label)) continue;

      const { text: amount, negative } = normalizeAmount(amountRaw);
      const entry = lookupCharge(label, utility);
      items.push({ label, amount, isCredit: negative, entry });

      if (entry?.askAbout && !negative && !seenFlags.has(`${entry.id}:${label}`)) {
        seenFlags.add(`${entry.id}:${label}`);
        flags.push({
          id: entry.id,
          title: entry.title,
          why: entry.askAbout,
          question: entry.question ?? "",
          label,
          amount,
        });
      }
    }
  }

  const unrecognized = items.filter((i) => !i.entry);
  const questions: string[] = [];
  for (const f of flags)
    if (f.question && !questions.includes(f.question)) questions.push(f.question);
  for (const u of unrecognized.slice(0, 5)) {
    questions.push(`Can you explain the charge labeled “${u.label}” (${u.amount}) on my bill?`);
  }

  return {
    utility,
    totalDue: findTotalDue(lines),
    dueDate: findDueDate(text),
    period: findPeriod(text),
    items,
    unrecognized,
    flags,
    questions,
  };
}
