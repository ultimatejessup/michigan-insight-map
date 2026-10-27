// Run with: bun test tests/redact.test.ts
import { describe, expect, test } from "bun:test";
import {
  REDACTED,
  countRemainingPii,
  describeCounts,
  redactBillText,
} from "../src/lib/bill/redact";

const SAMPLE = `Great Lakes Example Energy Co.                                          MONTHLY STATEMENT
Electric & Natural Gas Service | Fictional company for testing only

Sample Customer                                                  Account number:          0000-000-0000
123 Example Street                                               Statement date:        Oct 25, 2026
Anytown, MI 48000                                                Service period:        Sep 24 - Oct 23, 2026 (30 days)
                                                                 Payment due date:          Nov 16, 2026

Previous balance: $140.55   Payment received Oct 8: -$140.55   New charges: $162.18
TOTAL AMOUNT DUE: $162.18

Electric   E-SAMPLE-001   41,208   41,820   612 kWh
Power supply   612 kWh x $0.0820   $50.18
Power supply cost recovery (PSCR)   612 kWh x $0.0048   $2.94
Customer charge   30 days   $8.50
Questions? Call 1-800-555-0100.  Pay by Nov 16, 2026 to avoid a 2% late fee.`;

describe("redactBillText", () => {
  const r = redactBillText(SAMPLE);

  test("hides the account number, street address and the name above it", () => {
    expect(r.text).not.toContain("0000-000-0000");
    expect(r.text).not.toContain("123 Example Street");
    expect(r.text).not.toContain("Sample Customer");
    expect(r.counts.account).toBe(1);
    expect(r.counts.address).toBe(1);
    expect(r.counts.name).toBe(1);
  });

  test("keeps every charge, amount, rate, date and usage figure", () => {
    for (const keep of [
      "$162.18",
      "$140.55",
      "$50.18",
      "612 kWh x $0.0820",
      "$0.0048",
      "$2.94",
      "41,208",
      "41,820",
      "Nov 16, 2026",
      "Sep 24 - Oct 23, 2026",
      "30 days",
      "Account number:",
      "Anytown, MI 48000",
    ]) {
      expect(r.text).toContain(keep);
    }
  });

  test("keeps toll-free provider numbers", () => {
    expect(r.text).toContain("1-800-555-0100");
    expect(r.counts.phone).toBe(0);
  });

  test("is idempotent and the remaining-PII check is clean afterwards", () => {
    expect(redactBillText(r.text).text).toBe(r.text);
    expect(countRemainingPii(r.text)).toBe(0);
  });

  test("never lists the hidden values in the summary", () => {
    const summary = describeCounts(r.counts).join(", ");
    expect(summary).toBe("1 account or ID number, 1 street address, 1 name");
  });
});

describe("other personal details", () => {
  test("phone numbers, emails, PO boxes, labeled ids, long digit runs", () => {
    const t = redactBillText(
      [
        "Phone: (313) 555-0142   Email: jane.doe@example.com",
        "PO Box 4417 Detroit MI",
        "Customer ID: AB-123456   Meter No. 99887766",
        "Barcode 1234567890123",
        "Premise number 55-4433-221",
      ].join("\n"),
    );
    expect(t.text).not.toMatch(
      /555-0142|jane\.doe|4417|AB-123456|99887766|1234567890123|55-4433-221/,
    );
    expect(t.counts.phone).toBe(1);
    expect(t.counts.email).toBe(1);
    expect(t.counts.address).toBe(1);
    expect(t.counts.account).toBe(4);
  });

  test("apartment lines and directional street names", () => {
    const t = redactBillText("JOHN Q PUBLIC\n8029 W Warren Ave Apt 4B\nWarren MI 48093");
    expect(t.text).toBe(`${REDACTED}\n${REDACTED}\nWarren MI 48093`);
  });

  test("name above an address when OCR flattened the columns to single spaces", () => {
    const t = redactBillText(
      "Sample Customer Account number: 0000-000-0000\n123 Example Street Statement date: Oct 25, 2026\nAnytown, MI 48000",
    );
    expect(t.text).toBe(
      `${REDACTED} Account number: ${REDACTED}\n${REDACTED} Statement date: Oct 25, 2026\nAnytown, MI 48000`,
    );
    const label = redactBillText("Maria Lopez Phone: 313\n55 Oak Lane");
    expect(label.text).toBe(`${REDACTED} Phone: 313\n${REDACTED}`);
  });

  test("labeled names and greetings", () => {
    const t = redactBillText("Customer name: Maria Lopez     Dear Maria Lopez,\nThanks.");
    expect(t.text).not.toContain("Maria");
    expect(t.counts.name).toBe(2);
  });

  test("words the visitor asked to hide are removed everywhere, case-insensitively", () => {
    const t = redactBillText("Billed to Sampson\nSERVICE AT SAMPSON'S GARAGE, Lawrence", [
      "sampson",
      "Lawrence",
    ]);
    expect(t.text).not.toMatch(/sampson|lawrence/i);
    expect(t.counts.custom).toBe(3);
  });

  test("does not touch provider names or ordinary words above an address", () => {
    const t = redactBillText("Great Lakes Electric Company\n500 Main Street");
    expect(t.text.startsWith("Great Lakes Electric Company")).toBe(true);
    expect(t.counts.name).toBe(0);
  });

  test("amounts and usage that look like numbers are safe", () => {
    const line = "Usage 1,234 kWh   Total $1,234,567.89   Read 2026-10-25   Rate 0.1234";
    expect(redactBillText(line).text).toBe(line);
  });
});

describe("last-chance check", () => {
  test("flags personal details that were typed back in", () => {
    expect(countRemainingPii("Account number: 123456789")).toBeGreaterThan(0);
    expect(countRemainingPii("My name is Sampson", ["Sampson"])).toBe(1);
  });
});
