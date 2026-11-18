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

// Fictional text laid out the way a DTE-style PDF extracts: unicode minus signs, amounts without
// "$", two columns on one line, usage math in front of the amount, and a mixed electric + gas bill.
const DTE_STYLE = `Due Date:                              Nov 18, 2024
Total Due:                             $238.95
Billing Period:   OCT 01, 2024 - NOV 01, 2024
Last Month's Amount Due   0.00 Account Balance as of Sep 01, 2024   1,683.34
Down Payment   16.84 Payment Received Sep 23, 2024   − 168.33
Payment Received Sep 23, 2024   − 168.33 Thank You! Balance Prior to Current Charges   1,515.01
Your average daily electric cost for this period was $2.99   Your average daily gas cost for this period was $1.67
Power Supply Capacity Charge   18.27
Power Supply Non Capacity Charge   23.25
Distribution   496 KWH @ 0.061090   30.30 Usage History - Average per day
Nuclear Surcharge   0.41
Tax Credit B   −0.59
U-18255 SIR   −0.32
Residential Michigan Sales Tax   3.30
Total DTE Electric Company Current Charges   86.71
Gas Cost Recovery   19.08
U-20298 Calc C   72 CCF @ -0.005760   −0.41   Meter Reading 2471 Actual - 2543 Actual
IRM Surcharge   0.51
Residential Michigan Sales Tax   1.86   Current Last   Year
Total Current Charges   135.12`;

const AUTOPAY = `Withdrawal Date:   July 18, 2023
Withdrawal Amount:   $110.42
Payment Received Jun 15, 2023 Thank You!   − 72.51
Total Current Charges   110.42
Amount to be Withdrawn on July 18, 2023   $110.42
Service Charge   8.50
Distribution   517.427 @ 0.068790   35.59`;

describe("analyzeBill: DTE-style layout", () => {
  const a = analyzeBill(DTE_STYLE);
  const find = (l: string) =>
    a.items.find((i) => i.label.toLowerCase().startsWith(l.toLowerCase()));

  test("finds the due date and total even with wide spacing", () => {
    expect(a.dueDate).toBe("Nov 18, 2024");
    expect(a.totalDue).toBe("$238.95");
    expect(a.currentCharges).toBe("$135.12");
    expect(a.period).toBe("OCT 01, 2024 to NOV 01, 2024");
    expect(a.autopay).toBe(false);
  });
  test("recognizes a combined electric and gas bill", () => {
    expect(a.utility).toBe("combined");
  });
  test("treats a unicode minus as a credit and keeps the sign", () => {
    expect(find("Tax Credit B")?.amount).toBe("-$0.59");
    expect(find("Tax Credit B")?.isCredit).toBe(true);
    expect(find("Tax Credit B")?.entry?.id).toBe("credit");
    expect(find("U-20298")?.amount).toBe("-$0.41");
    expect(find("Payment Received")?.amount).toBe("-$168.33");
  });
  test("splits two charges that share a line and drops the duplicate", () => {
    expect(find("Down Payment")?.amount).toBe("$16.84");
    expect(a.items.filter((i) => i.label.startsWith("Payment Received")).length).toBe(1);
    expect(find("Balance Prior")?.entry?.id).toBe("previous-balance");
  });
  test("does not turn tips or messages into charges", () => {
    expect(a.items.some((i) => /average daily/i.test(i.label))).toBe(false);
    expect(a.items.some((i) => /^total/i.test(i.label))).toBe(false);
  });
  test("keeps the whole word Tax and does not cut a trailing x", () => {
    expect(a.items.filter((i) => i.label === "Residential Michigan Sales Tax").length).toBe(2);
  });
  test("explains DTE-specific charges from the DTE explanation", () => {
    expect(find("Nuclear")?.entry?.id).toBe("nuclear");
    expect(find("Power Supply Capacity")?.entry?.id).toBe("capacity");
    expect(find("Power Supply Non Capacity")?.entry?.id).toBe("non-capacity");
    expect(find("IRM")?.entry?.id).toBe("infrastructure");
  });
  test("case-number adjustments are explained generally and flagged for a question", () => {
    expect(find("U-18255")?.entry?.id).toBe("case-rider");
    expect(a.flags.some((f) => f.id === "case-rider")).toBe(true);
  });
  test("the unit rate after @ is never read as a charge", () => {
    expect(a.items.some((i) => i.amount === "$0.06" || i.amount === "$0.01")).toBe(false);
    expect(find("Distribution")?.amount).toBe("$30.30");
  });
});

describe("analyzeBill: automatic withdrawal", () => {
  const a = analyzeBill(AUTOPAY);
  test("labels the withdrawal as such and does not list it as a charge", () => {
    expect(a.autopay).toBe(true);
    expect(a.totalDue).toBe("$110.42");
    expect(a.dueDate).toBe("July 18, 2023");
    expect(a.items.some((i) => /withdraw/i.test(i.label))).toBe(false);
  });
  test("a payment with Thank You! keeps a clean label", () => {
    expect(a.items.find((i) => i.amount === "-$72.51")?.label).toBe(
      "Payment Received Jun 15, 2023",
    );
  });
});
