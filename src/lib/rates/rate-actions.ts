/**
 * MPSC rate actions (rate cases, approvals, assistance programs, reforms) from the existing
 * Supabase table `mpsc_rate_actions`. Stored values only: nothing is summed, averaged or compared.
 *
 * Actions are filed by utility, not by county (`geography_id` is empty), so a county's actions are
 * the ones for the utilities on record for it, plus statewide actions. Rows with no source link
 * are listed by title only: no figure is shown without its source.
 */

export type RateAction = {
  id: number;
  /** Utility as stored ("" or "Multiple" for statewide actions). */
  utility: string;
  actionType: string;
  title: string;
  caseNumber: string | null;
  filingDate: string | null;
  decisionDate: string | null;
  effectiveDate: string | null;
  requestedMillions: number | null;
  approvedMillions: number | null;
  /** Dollars a month for a typical residential customer, as stored. */
  monthlyImpact: number | null;
  /** Percent increase for residential customers, as stored. */
  pctIncrease: number | null;
  sourceUrl: string | null;
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function date(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
}

function text(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export function parseRateActions(rows: unknown): RateAction[] {
  if (!Array.isArray(rows)) return [];
  const out: RateAction[] = [];
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const id = num(r["id"]);
    const title = text(r["action_title"]);
    if (id === null || title === null) continue;
    const url = text(r["source_url"]);
    out.push({
      id,
      utility: text(r["utility_name"]) ?? "",
      actionType: text(r["action_type"]) ?? "Action",
      title,
      caseNumber: text(r["case_number"]),
      filingDate: date(r["filing_date"]),
      decisionDate: date(r["decision_date"]),
      effectiveDate: date(r["effective_date"]),
      requestedMillions: num(r["amount_requested_millions"]),
      approvedMillions: num(r["amount_approved_millions"]),
      monthlyImpact: num(r["residential_monthly_impact"]),
      pctIncrease: num(r["residential_pct_increase"]),
      sourceUrl: url && /^https?:\/\//i.test(url) ? url : null,
    });
  }
  return out;
}

/** The date an action is listed under: decision, else filing. Undated actions sort last. */
export function actionDate(a: RateAction): string | null {
  return a.decisionDate ?? a.filingDate;
}

export function sortActions(actions: RateAction[]): RateAction[] {
  return [...actions].sort((a, b) => {
    const da = actionDate(a);
    const db = actionDate(b);
    if (da === db) return a.id - b.id;
    if (da === null) return 1;
    if (db === null) return -1;
    return db.localeCompare(da);
  });
}

export function isStatewide(a: RateAction): boolean {
  return a.utility === "" || a.utility.toLowerCase() === "multiple";
}

/**
 * Rate-table utility names (territory tables) to the names used in rate actions. Only names that
 * differ are listed; everything else matches as stored. Utilities with no action are simply absent.
 */
const ACTION_NAME: Record<string, string> = {
  "Consumers Energy": "Consumers Energy Electric",
};

export function actionNamesFor(electric: string[] | null, gas: string[] | null): string[] {
  const names = [...(electric ?? []), ...(gas ?? [])].map((n) => ACTION_NAME[n] ?? n);
  return Array.from(new Set(names));
}

export type CountyActions = { utility: RateAction[]; statewide: RateAction[] };

/** With no county, everything is returned. With a county, only its utilities' actions and statewide ones. */
export function actionsForUtilities(actions: RateAction[], names: string[] | null): CountyActions {
  const sorted = sortActions(actions);
  const statewide = sorted.filter(isStatewide);
  const utilityActions = sorted.filter((a) => !isStatewide(a));
  return {
    utility:
      names === null ? utilityActions : utilityActions.filter((a) => names.includes(a.utility)),
    statewide,
  };
}

export async function fetchRateActions(signal?: AbortSignal): Promise<RateAction[] | null> {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !key) return null;
  const query = new URLSearchParams({
    select:
      "id,utility_name,action_type,action_title,case_number,filing_date,decision_date,effective_date,amount_requested_millions,amount_approved_millions,residential_monthly_impact,residential_pct_increase,source_url",
    order: "id.asc",
    limit: "1000",
  });
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/mpsc_rate_actions?${query}`, {
    headers: { apikey: key, Accept: "application/json" },
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`Rate actions request failed (${res.status})`);
  return parseRateActions(await res.json());
}
