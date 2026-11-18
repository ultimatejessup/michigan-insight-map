// Plain-language glossary of charges that commonly appear on Michigan utility bills.
// Used on the visitor's device by analyze.ts: no bill text is sent anywhere.
//
// Rules for editing this file:
//  - Describe what a charge is, in general terms. Never state a rate, amount or date.
//  - Utility-specific names change; keep `match` patterns broad and the wording hedged
//    ("usually", "on many bills").
//  - Every entry points to a source. Add or change entries only after checking that source.
//  - Order matters: the first matching entry wins, so put specific patterns before general ones.

export type UtilityKind = "electric" | "gas" | "water" | "internet" | "unknown";

export const SOURCES = {
  mpscGuide: {
    label:
      "Michigan Public Service Commission: understanding your residential electric and gas bill",
    url: "https://www.michigan.gov/mpsc/consumer/be-informed/tips/understanding-your-residential-electric-gas-bill",
  },
  mpscTerms: {
    label: "Michigan Public Service Commission: common energy bill terms",
    url: "https://www.michigan.gov/mpsc/faqs/energy-bill-terms/common-term-guide",
  },
  mpscElectric: {
    label: "Michigan Public Service Commission: residential electric bill charges",
    url: "https://www.michigan.gov/documents/mpsc/electric_residential_bill_charges_final_318312_7.pdf",
  },
  mpscGas: {
    label: "Michigan Public Service Commission: explanation of natural gas charges",
    url: "https://www.michigan.gov/documents/mpsc/Explanation-of-Natural-Gas-Charges_683086_7.pdf",
  },
  dteGas: {
    label: "DTE Energy: explanation of current charges",
    url: "https://www.dteenergy.com/content/dam/dteenergy/deg/website/business/service-and-price/pricing/ExplanationCharges.pdf",
  },
  mguTerms: {
    label: "Michigan Gas Utilities: billing terms",
    url: "https://accel.michigangasutilities.com/home/billing_terms.aspx",
  },
} as const;

export type SourceKey = keyof typeof SOURCES;

export type GlossaryEntry = {
  id: string;
  /** Name shown to the resident. */
  title: string;
  /** Tested against the lower-cased line label. */
  match: RegExp;
  /** What the charge is, in plain words. */
  meaning: string;
  /** When present, the charge is listed under "Charges you may want to ask about". */
  askAbout?: string;
  /** Short question the resident can read aloud to the provider. */
  question?: string;
  source?: SourceKey;
  /** Limits the entry to these bill types. Omit for any bill. Applies when the type is known. */
  only?: Exclude<UtilityKind, "unknown">[];
};

export const GLOSSARY: GlossaryEntry[] = [
  // ---- Fees and situations worth a question (checked first) ----
  {
    id: "late-fee",
    title: "Late fee",
    match: /late (payment )?(fee|charge)|late fee|late penalty|finance charge|interest charge/,
    meaning: "A charge added when a payment arrives after the due date.",
    askAbout:
      "Late fees can often be avoided or explained. Ask whether the payment date was recorded correctly and whether a payment plan or one-time waiver is available.",
    question: "Why was a late fee added, and can it be removed or can I set up a payment plan?",
  },
  {
    id: "reconnect",
    title: "Reconnection or disconnection fee",
    match:
      /reconnect|re-connect|restoration|restore (of )?service|disconnect(ion)? (fee|charge)|shut.?off (fee|charge)|turn.?on (fee|charge)/,
    meaning: "A fee for turning service back on after it was stopped, or for a shut-off visit.",
    askAbout:
      "Ask why service was disconnected and whether the fee is correct. Michigan has shut-off protections and assistance programs, so ask about them before paying.",
    question:
      "What led to this reconnection or disconnection fee, and what help programs apply to me?",
  },
  {
    id: "returned-payment",
    title: "Returned payment fee",
    match: /returned (payment|check|item)|\bnsf\b|insufficient funds|dishonored/,
    meaning: "A fee when a payment you made was returned by your bank.",
    askAbout: "Check that the original payment really was returned before paying this fee.",
    question: "Can you confirm the payment that was returned and how this fee was calculated?",
  },
  {
    id: "deposit",
    title: "Deposit",
    match: /deposit/,
    meaning: "Money held by the provider as security. It is usually returned or credited later.",
    askAbout:
      "Ask why a deposit was required, how much of it is refundable, and when it is credited back.",
    question: "Why was a deposit charged, and when will it be returned or credited?",
  },
  {
    id: "add-on",
    title: "Optional protection plan or add-on",
    match:
      /protection plan|home protection|repair plan|warranty|surge protect|appliance (plan|protect|repair)|protectionplus|service plan|home services|optional/,
    meaning:
      "A paid extra, such as a repair or protection plan, that is separate from your energy or water service.",
    askAbout:
      "These are usually optional. Ask whether you signed up for it, what it covers, and how to cancel it if you do not want it.",
    question: "Is this plan optional, when did I sign up for it, and how do I cancel it?",
  },
  {
    id: "past-due",
    title: "Past-due balance",
    match: /past due|unpaid|arrear|carried forward|amount carried/,
    meaning: "Money still owed from an earlier bill, added to this one.",
    askAbout:
      "Check this against your payment history. Ask for the dates and amounts that make it up, and about payment plans.",
    question: "Can you list the earlier charges and payments that make up this past-due balance?",
  },
  {
    id: "previous-balance",
    title: "Previous balance",
    match: /previous balance|prior balance|balance forward|last bill/,
    meaning:
      "What was owed at the end of your last bill. Payments you made since then should appear as separate credits.",
  },
  {
    id: "estimated-read",
    title: "Estimated meter reading",
    match: /estimated (read|reading|usage|meter)|\best\.? (read|reading)|read type.*estimate/,
    meaning:
      "The provider guessed your use instead of reading the meter. The difference is corrected on a later bill.",
    askAbout:
      "Estimated bills can be too high or too low. Ask when the meter was last read and whether you can send in a reading.",
    question: "Why was my meter read estimated, and can I submit my own meter reading?",
    source: "mguTerms",
  },
  {
    id: "budget-billing",
    title: "Budget or levelized billing",
    match:
      /budget (billing|plan|amount)|level(ized)? (billing|payment|plan)|even (pay|payment)|average billing/,
    meaning:
      "A plan that spreads your yearly cost into similar monthly payments. The plan is adjusted if actual use differs.",
    askAbout:
      "Ask how the monthly amount is set and when it is reviewed, since a catch-up amount can be added later.",
    question: "How is my budget billing amount set, and when is it reviewed or adjusted?",
  },

  // ---- Michigan electric and gas charges ----
  {
    id: "lieaf",
    title: "Low Income Energy Assistance Fund (LIEAF)",
    match: /lieaf|low.?income energy|energy assistance fund|energy fund/,
    meaning:
      "A small monthly charge that supports programs helping eligible Michigan households manage energy bills and avoid shut-offs.",
    source: "mpscTerms",
  },
  {
    id: "energy-optimization",
    title: "Energy efficiency program charge",
    match:
      /energy optimization|energy waste reduction|\bewr\b|\beo (surcharge|charge)|energy efficiency/,
    meaning:
      "A monthly charge that funds energy efficiency programs, such as rebates and audits, that help reduce energy use.",
    source: "dteGas",
  },
  {
    id: "renewable",
    title: "Renewable energy charge",
    match: /renewable/,
    meaning: "A charge that supports renewable energy, such as wind and solar, under Michigan law.",
    source: "mpscTerms",
  },
  {
    id: "securitization",
    title: "Securitization charge",
    match: /securitization/,
    meaning:
      "A charge that repays bonds the utility issued to cover certain costs, for example retired power plants.",
  },
  {
    id: "infrastructure",
    title: "Infrastructure or main replacement charge",
    match:
      /infrastructure|\birm\b|main replacement|pipeline replacement|reliability (charge|surcharge)|grid (charge|surcharge)/,
    meaning:
      "A charge that helps pay for replacing or upgrading pipes, poles and wires. It is approved by the Michigan Public Service Commission.",
    source: "dteGas",
  },
  {
    id: "power-supply",
    title: "Power supply charge",
    match:
      /pscr|power supply|capacity energy|non.?capacity|energy charge|power cost|fuel (and|&) purchased|supply charge|generation/,
    meaning:
      "The cost of producing or buying the electricity you used. Part of it can change from month to month with fuel and power costs (called the Power Supply Cost Recovery factor, or PSCR).",
    source: "mpscElectric",
  },
  {
    id: "gas-cost",
    title: "Gas cost recovery (GCR)",
    match: /gas cost|\bgcr\b|cost of gas|commodity|gas supply/,
    meaning:
      "The cost of the natural gas itself, passed through to customers. It is adjusted over time under a plan reviewed by the Michigan Public Service Commission.",
    source: "mpscGas",
  },
  {
    id: "gas-supply-fees",
    title: "Gas supply fees (reservation, balancing, acquisition)",
    match: /reservation|balancing|acquisition/,
    meaning:
      "Smaller fees tied to securing and delivering your gas supply, listed beside the gas cost.",
    source: "mpscGas",
  },
  {
    id: "distribution",
    title: "Distribution or delivery charge",
    match: /distribution|delivery|transition(al)? recovery|\btrm\b/,
    meaning:
      "The cost of delivering energy to your home over the utility's poles, wires or pipes, and of keeping that system running. It usually depends on how much you use.",
    source: "mpscGuide",
  },
  {
    id: "customer-charge",
    title: "Customer, service or system access charge",
    match:
      /customer charge|system access|monthly service|service charge|availability charge|facilit(y|ies) charge|daily (customer|service) charge|base charge|meter (charge|fee)|readiness/,
    meaning:
      "A fixed charge that covers things like your meter, billing and customer service. You pay it even if you use very little.",
    source: "mpscGuide",
  },
  {
    id: "tax",
    title: "Taxes",
    match: /sales tax|use tax|state tax|\btax\b|taxes/,
    meaning:
      "Michigan taxes added to your bill. On the residential energy bills we checked, the state tax is shown as a percent of the charges.",
    source: "dteGas",
  },

  // ---- Water and sewer ----
  {
    id: "sewer",
    title: "Sewer or wastewater charge",
    match: /sewer|sewage|wastewater/,
    meaning:
      "The cost of carrying away and treating used water. It is often based on the water you used.",
  },
  {
    id: "drainage",
    title: "Drainage or stormwater charge",
    match: /drainage|storm ?water/,
    meaning:
      "A charge for handling rain and runoff from roofs and pavement. It is often based on the size of your property, not on your water use.",
  },
  {
    id: "water-assistance",
    title: "Water assistance program charge",
    match: /\bwrap\b|water residential assistance|water assistance|affordability/,
    meaning: "A charge that supports programs helping households that struggle to pay water bills.",
  },
  {
    id: "lead-line",
    title: "Lead service line charge",
    match: /lead (service )?line|\blsl\b|lead and copper/,
    meaning: "A charge some water systems add to help pay for replacing lead service lines.",
  },
  {
    id: "water-use",
    title: "Water usage charge",
    match: /water (use|usage|charge|service|consumption)|^water\b|consumption|gallons|\bunits\b/,
    meaning:
      "The cost of the water you used, usually measured in units such as gallons or cubic feet.",
  },

  // ---- Internet ----
  {
    id: "equipment",
    only: ["internet"],
    title: "Equipment rental",
    match: /modem|router|equipment|gateway|wi-?fi (rental|equipment)|rental/,
    meaning:
      "A monthly fee to rent equipment from the provider. You can often use your own compatible equipment instead.",
    askAbout:
      "Ask whether you can return the rented equipment and use your own to stop this charge.",
    question: "Can I use my own modem or router to remove the equipment rental fee?",
  },
  {
    id: "promo",
    only: ["internet"],
    title: "Promotional price or discount",
    match: /promo|promotion|introductory|intro (rate|price)|autopay discount|discount/,
    meaning:
      "A temporary price cut or discount. The price often rises when the promotion period ends.",
    askAbout: "Ask when the promotion ends and what the monthly price will be afterward.",
    question: "When does my promotional price end, and what will I pay after that?",
  },
  {
    id: "provider-fees",
    only: ["internet"],
    title: "Provider-added fees",
    match:
      /broadcast|regional sports|franchise|admin(istrative)? fee|connection fee|installation|activation|regulatory (recovery|cost)|cost recovery fee|surcharge|fees?\b/,
    meaning:
      "Extra fees the provider adds on top of the service price. Names and amounts vary by provider.",
    askAbout: "Ask what each of these fees pays for and whether any can be removed.",
    question: "Can you explain what each of these fees is for and whether any are optional?",
  },

  // ---- Credits ----
  {
    id: "credit",
    title: "Credit or adjustment",
    match: /credit|adjustment|refund|rebate|payment received|payment - thank|thank you/,
    meaning: "An amount taken off what you owe, such as a payment you made or a correction.",
  },
];

/** First matching entry for a line label, or null. */
export function lookupCharge(
  label: string,
  utility: UtilityKind = "unknown",
): GlossaryEntry | null {
  const l = label.toLowerCase();
  for (const e of GLOSSARY) {
    if (utility !== "unknown" && e.only && !e.only.includes(utility)) continue;
    if (e.match.test(l)) return e;
  }
  return null;
}
