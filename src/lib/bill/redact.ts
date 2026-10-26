/**
 * On-device redaction for the Bill Explainer.
 *
 * Pure functions, no network, no browser APIs. They run in the visitor's browser on text that was
 * extracted from their bill, before anything is sent to the server. Automatic hiding is a
 * best-effort helper: the visitor always reviews and can edit the result before sending.
 */

export const REDACTED = "[REDACTED]";

export type PiiKind = "account" | "address" | "name" | "phone" | "email" | "custom";

export type PiiCounts = Record<PiiKind, number>;

export interface RedactResult {
  text: string;
  counts: PiiCounts;
  total: number;
}

export const PII_LABELS: Record<PiiKind, { one: string; many: string }> = {
  account: { one: "account or ID number", many: "account or ID numbers" },
  address: { one: "street address", many: "street addresses" },
  name: { one: "name", many: "names" },
  phone: { one: "phone number", many: "phone numbers" },
  email: { one: "email address", many: "email addresses" },
  custom: { one: "word you asked us to hide", many: "words you asked us to hide" },
};

function emptyCounts(): PiiCounts {
  return { account: 0, address: 0, name: 0, phone: 0, email: 0, custom: 0 };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Words that mean a line is about the provider or the bill, not a person. */
const NOT_A_NAME =
  /\b(energy|electric|electricity|gas|power|water|sewer|company|co|inc|llc|corp|corporation|services?|utility|utilities|statement|bill|billing|payment|amount|summary|charges?|remit|mail|department|dept|office|account|due|total|page|detail|details|usage|meter|rate|plan)\b/i;

/** Words that end a company name; a capitalized run that ends in one of these is not a person. */
const PROVIDER_WORD =
  /^(energy|electric|electricity|gas|power|water|sewer|company|co|inc|llc|corp|corporation|utility|utilities|services?)\.?$/i;

const STREET_SUFFIX =
  "Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Circle|Cir|Way|Place|Pl|Parkway|Pkwy|Highway|Hwy|Trail|Trl|Terrace|Ter|Square|Sq";

const ADDRESS_RE = new RegExp(
  String.raw`\b\d{1,6}[ \t]+(?:[NSEW]\.?[ \t]+)?(?:[A-Za-z0-9'.-]+[ \t]+){0,4}?(?:${STREET_SUFFIX})\b\.?(?:[ \t]+(?:NE|NW|SE|SW|N|S|E|W)\b\.?)?(?:[ \t,]+(?:Apt|Apartment|Unit|Ste|Suite|Lot|#)\.?[ \t]*[A-Za-z0-9-]+)?`,
  "gi",
);

const PO_BOX_RE = /\bP\.?[ \t]?O\.?[ \t]+Box[ \t]+\d+\b/gi;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const PHONE_RE = /(?<![\d$])(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}(?!\d)/g;
const TOLL_FREE = /^(?:\+?1[ .-]?)?\(?(?:800|833|844|855|866|877|888)\)?/;

/**
 * "Account number: 1234-567-890", "Acct # 12345678", "Customer ID 00-1234", "Meter no. 998877".
 * The value must be a single token that contains a digit (digit-only groups may follow after one
 * space), so ordinary words after a label are left alone.
 */
const LABELED_ID_RE =
  /\b((?:account|acct|customer|service|premise|premises|location|contract|agreement|reference|ref|payer|meter)[ \t]*(?:number|num|no|id|#)\b\.?[ \t]*[:#.-]?[ \t]*)((?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{3,24}(?:[ \t]\d{3,}(?:-\d+)*)*)/gi;
const ACCOUNT_WORD_RE =
  /\b((?:account|acct)[ \t]*[:#][ \t]*)((?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{3,24}(?:[ \t]\d{3,}(?:-\d+)*)*)/gi;

/** Long unlabeled digit runs: 9+ digits in a row, or 3+ dash-joined digit groups with 9+ digits. */
const LONG_DIGITS_RE = /(?<![\d$.,-])(?:\d{9,}|\d{2,}(?:-\d{2,}){2,})(?![\d,-])/g;

const LABELED_NAME_RE =
  /\b((?:customer name|account name|account holder|name on account|bill(?:ed)? to|service for|prepared for|statement for)[ \t]*[:-][ \t]*)([^\n]{2,60}?)(?=[ \t]{2,}|\n|$)/gi;
const DEAR_RE = /\b(Dear[ \t]+)([^\n,:]{2,40})([,:])/g;

const NAME_LINE_RE = /^[A-Z][A-Za-z'’.-]*(?:[ \t]+[A-Z][A-Za-z'’.-]*\.?){1,3}$/;
const CARE_OF_RE = /^(?:c\/o|attn:?|attention:?)[ \t]+/i;

function looksLikeName(segment: string): boolean {
  const s = segment.trim();
  if (s.length < 3 || s.length > 50) return false;
  if (/\d/.test(s)) return false;
  if (NOT_A_NAME.test(s)) return false;
  return NAME_LINE_RE.test(s);
}

/**
 * Length of a leading run of 2-4 capitalized words that could be a person's name, such as the
 * start of "Sample Customer Account number: ..." when OCR has flattened columns to single
 * spaces. Stops at provider/bill words and at anything followed by a colon (a label).
 */
function leadingNameSpan(line: string): number {
  const re = /[ \t]*([A-Z][A-Za-z'’.-]*\.?)/y;
  let pos = 0;
  let words = 0;
  let end = 0;
  while (words < 4) {
    re.lastIndex = pos;
    const m = re.exec(line);
    if (!m) break;
    const word = m[1] ?? "";
    if (NOT_A_NAME.test(word) || /\d/.test(word)) {
      if (PROVIDER_WORD.test(word)) return 0;
      break;
    }
    if (line.charAt(re.lastIndex) === ":") break;
    words++;
    end = re.lastIndex;
    pos = re.lastIndex;
  }
  return words >= 2 ? end : 0;
}

function bump(counts: PiiCounts, kind: PiiKind, n = 1) {
  counts[kind] += n;
}

/** Redact `input`. `extraTerms` are words the visitor asked to hide (name, street, and so on). */
export function redactBillText(input: string, extraTerms: string[] = []): RedactResult {
  const counts = emptyCounts();
  let text = input.replace(/\r\n?/g, "\n");

  // 1. Words the visitor typed. Most reliable for names, so it goes first.
  const terms = [...new Set(extraTerms.map((t) => t.trim()).filter((t) => t.length >= 2))].sort(
    (a, b) => b.length - a.length,
  );
  for (const term of terms) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`, "giu");
    text = text.replace(re, () => {
      bump(counts, "custom");
      return REDACTED;
    });
  }

  // 2. Emails and phone numbers (toll-free numbers belong to the provider and are kept).
  text = text.replace(EMAIL_RE, () => {
    bump(counts, "email");
    return REDACTED;
  });
  text = text.replace(PHONE_RE, (m) => {
    if (TOLL_FREE.test(m)) return m;
    bump(counts, "phone");
    return REDACTED;
  });

  // 3. Labeled account / customer / meter numbers, then long digit runs.
  const hideValue = (_m: string, label: string) => {
    bump(counts, "account");
    return `${label}${REDACTED}`;
  };
  text = text.replace(LABELED_ID_RE, hideValue);
  text = text.replace(ACCOUNT_WORD_RE, hideValue);
  text = text.replace(LONG_DIGITS_RE, (m) => {
    // Dash-joined groups must hold 9+ digits in total, so ISO dates (8 digits) are never hidden.
    if (m.replace(/\D/g, "").length < 9) return m;
    bump(counts, "account");
    return REDACTED;
  });

  // 4. Labeled names and "Dear ..." greetings.
  text = text.replace(LABELED_NAME_RE, (_m, label: string) => {
    bump(counts, "name");
    return `${label}${REDACTED}`;
  });
  text = text.replace(DEAR_RE, (_m, dear: string, _name: string, end: string) => {
    bump(counts, "name");
    return `${dear}${REDACTED}${end}`;
  });

  // 5. Street addresses, then the name line printed directly above an address.
  const lines = text.split("\n");
  const addressLines: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    let hit = false;
    lines[i] = (lines[i] ?? "")
      .replace(ADDRESS_RE, () => {
        hit = true;
        bump(counts, "address");
        return REDACTED;
      })
      .replace(PO_BOX_RE, () => {
        hit = true;
        bump(counts, "address");
        return REDACTED;
      });
    if (hit) addressLines.push(i);
  }
  for (const i of addressLines) {
    for (let back = 1; back <= 2; back++) {
      const j = i - back;
      if (j < 0) break;
      const line = lines[j] ?? "";
      if (!line.trim()) continue;
      const parts = line.split(/[ \t]{2,}/);
      const first = (parts[0] ?? "").replace(CARE_OF_RE, "");
      if (CARE_OF_RE.test(parts[0] ?? "") || looksLikeName(first)) {
        parts[0] = REDACTED;
        lines[j] = parts.join("  ");
        bump(counts, "name");
      } else {
        const span = leadingNameSpan(line);
        if (span > 0) {
          lines[j] = REDACTED + line.slice(span);
          bump(counts, "name");
        }
      }
      break; // only the nearest non-empty line above
    }
  }
  text = lines.join("\n");

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { text, counts, total };
}

/** How many items would still be hidden in `text`. Used for a last check before sending. */
export function countRemainingPii(text: string, extraTerms: string[] = []): number {
  return redactBillText(text, extraTerms).total;
}

/** "2 account or ID numbers, 1 street address" — never includes the hidden values themselves. */
export function describeCounts(counts: PiiCounts): string[] {
  return (Object.keys(counts) as PiiKind[])
    .filter((k) => counts[k] > 0)
    .map((k) => `${counts[k]} ${counts[k] === 1 ? PII_LABELS[k].one : PII_LABELS[k].many}`);
}
