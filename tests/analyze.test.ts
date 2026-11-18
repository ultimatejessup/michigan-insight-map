// Run with: bun test tests/analyze.test.ts
// All bills here are fictional and written for testing.
import { describe, expect, test } from "bun:test";
import { analyzeBill } from "../src/lib/bill/analyze";
import { lookupCharge } from "../src/lib/bill/glossary";

const ELECTRIC = `Great Lakes Example Energy Co.                                          MONTHLY STATEMENT
Electric Service | Fictional company for testing only

Statement date:        Oct 25, 2026
Service period:        Sep 24 - Oct 23, 2026 (30 days)
Payment due date:          Nov 16, 2026

Previous balance: $140.55   Payment received Oct 8: -$140.55   New charges: $162.18
TOTAL AMOUNT DUE: $162.18

Electric   E-SAMPLE-001   41,208   41,820   612 kWh
Power supply   612 kWh x $0.0820   $50.18
Power supply cost recovery (PSCR)   612 kWh x $0.0048   $2.94
Distribution   612 kWh x $0.0600   $36.72
Customer charge   30 days   $8.50
Energy optimization   $1.25
LIEAF   $0.85
Late payment charge   $3.25
Mystery Program Fee   $4.10
Sales tax 4%   $4.20
Pay by Nov 16, 2026 to avoid a 2% late fee.`;

const GAS = `Example Gas Co (fictional)
Billing period 09/19/2026 to 10/20/2026
Meter reading: estimated read
Gas cost recovery   23 CCF at $0.3359   $7.73
Distribution charge   23 CCF at $0.2975   $6.84
Daily customer charge   31 Days at $0.4274   $12.39
Infrastructure recovery mechanism   $2.10
Total amount due   $29.06
Payment due: 11/12/2026`;

describe("analyzeBill: electric", () => {
  const a = analyzeBill(ELECTRIC);
  const byLabel = (l: string) =>
    a.items.find((i) => i.label.toLowerCase().startsWith(l.toLowerCase()));

  test("reads the summary fields exactly as printed", () => {
    expect(a.utility).toBe("electric");
    expect(a.totalDue).toBe("$162.18");
    expect(a.dueDate).toBe("Nov 16, 2026");
    expect(a.period).toBe("Sep 24 to Oct 23, 2026");
  });

  test("keeps the printed amount, not the per-kWh rate", () => {
    expect(byLabel("Power supply")?.amount).toBe("$50.18");
    expect(byLabel("Customer charge")?.amount).toBe("$8.50");
    expect(byLabel("Distribution")?.amount).toBe("$36.72");
    expect(a.items.some((i) => i.amount === "$0.08")).toBe(false);
  });

  test("splits several label: amount pairs on one line and marks credits", () => {
    expect(byLabel("Previous balance")?.amount).toBe("$140.55");
    const pay = byLabel("Payment received");
    expect(pay?.amount).toBe("-$140.55");
    expect(pay?.isCredit).toBe(true);
    expect(byLabel("New charges")).toBeUndefined();
  });

  test("never flags a previous balance that was paid, or a credit", () => {
    expect(a.flags.some((f) => f.id === "previous-balance")).toBe(false);
    expect(a.flags.some((f) => f.label === "Payment received Oct 8")).toBe(false);
  });

  test("flags the late payment charge with its amount", () => {
    const f = a.flags.find((x) => x.id === "late-fee");
    expect(f?.amount).toBe("$3.25");
    expect(f?.question.length).toBeGreaterThan(10);
  });

  test("explains recognized charges and lists the unknown one", () => {
    expect(byLabel("Customer charge")?.entry?.id).toBe("customer-charge");
    expect(byLabel("Power supply cost recovery")?.entry?.id).toBe("power-supply");
    expect(byLabel("LIEAF")?.entry?.id).toBe("lieaf");
    expect(a.unrecognized.map((u) => u.label)).toEqual(["Mystery Program Fee"]);
    expect(a.questions.some((q) => q.includes("Mystery Program Fee") && q.includes("$4.10"))).toBe(
      true,
    );
  });

  test("does not list the total line as a charge", () => {
    expect(a.items.some((i) => /total amount due/i.test(i.label))).toBe(false);
  });
});

describe("analyzeBill: gas", () => {
  const a = analyzeBill(GAS);
  test("detects gas, period, due date and total", () => {
    expect(a.utility).toBe("gas");
    expect(a.period).toBe("09/19/2026 to 10/20/2026");
    expect(a.dueDate).toBe("11/12/2026");
    expect(a.totalDue).toBe("$29.06");
  });
  test("flags an estimated meter read even though the line has no amount", () => {
    expect(a.flags.some((f) => f.id === "estimated-read")).toBe(true);
  });
  test("reads gas charges with their glossary entries", () => {
    const find = (l: string) => a.items.find((i) => i.label.toLowerCase().startsWith(l));
    expect(find("gas cost recovery")?.entry?.id).toBe("gas-cost");
    expect(find("distribution")?.amount).toBe("$6.84");
    expect(find("daily customer")?.entry?.id).toBe("customer-charge");
    expect(find("infrastructure")?.entry?.id).toBe("infrastructure");
  });
});

describe("glossary", () => {
  test("energy optimization is not mistaken for a power supply energy charge", () => {
    expect(lookupCharge("Energy Optimization")?.id).toBe("energy-optimization");
  });
  test("a modem rental on an internet bill is an add-on worth asking about", () => {
    expect(lookupCharge("Modem rental", "internet")?.askAbout).toBeTruthy();
  });
  test("an unknown label returns null on an energy bill", () => {
    expect(lookupCharge("Mystery Program Fee", "electric")).toBeNull();
  });
  test("internet-only fee wording is not applied to an electric bill", () => {
    expect(lookupCharge("Some surcharge", "electric")).toBeNull();
    expect(lookupCharge("Some surcharge", "internet")?.id).toBe("provider-fees");
  });
  test("analysis of empty or non-bill text returns no items and does not throw", () => {
    const a = analyzeBill("hello there");
    expect(a.items).toEqual([]);
    expect(a.totalDue).toBeNull();
    expect(a.utility).toBe("unknown");
  });
});
