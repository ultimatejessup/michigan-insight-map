// Energy burden by race from published studies, stored in energy_burden_by_race.
// Stored values only: nothing is averaged, ranked or compared here.
//
// These rows are NOT county or Michigan-statewide figures. They come from national studies,
// a 48-city study and the Detroit metro, with different years and definitions, so the page
// shows them as a separate reference and never merges them with county income-level burden.
//
// `study_scope` and `burden_measure` are optional columns (see
// supabase/migrations-for-review/2026-11-17_energy_burden_by_race_scope_labels.sql). Until the
// owner applies that migration they are absent and every row falls into "Study area not labeled".

export type RaceReferenceRow = {
  id: number;
  /** Group as stored, e.g. "Black / African American". */
  raceEthnicity: string;
  /** Median share of income spent on home energy, when the study gives one. */
  burdenPct: number | null;
  /** Median burden among low-income households, when that is the figure the row holds. */
  lowIncomeMedianPct: number | null;
  /** How much higher the group's burden is than white households', in percent. */
  pctAboveWhite: number | null;
  /** Share of households above the study's high-burden threshold. */
  pctHighBurden: number | null;
  /** Study year label as stored, e.g. "2020 (AHS 2017 data)". */
  dataYear: string;
  source: string;
  sourceUrl: string | null;
  /** Where the study applies (e.g. "National", "Detroit metro"), or null if not yet labeled. */
  scope: string | null;
  /** What the percentage measures, or null if not yet labeled. */
  measure: string | null;
};

export type RaceReferenceGroup = { scope: string | null; rows: RaceReferenceRow[] };

export const UNLABELED_SCOPE = "Study area not labeled";

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/** Rows with no usable number or no source link are dropped: no figure is shown without a source. */
export function parseRaceReference(rows: unknown): RaceReferenceRow[] {
  if (!Array.isArray(rows)) return [];
  const out: RaceReferenceRow[] = [];
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const id = num(r["id"]);
    const race = str(r["race_ethnicity"]);
    const url = str(r["source_url"]);
    if (id === null || race === null || url === null || !/^https?:\/\//i.test(url)) continue;
    const row: RaceReferenceRow = {
      id,
      raceEthnicity: race,
      burdenPct: num(r["energy_burden_percent"]),
      lowIncomeMedianPct: num(r["low_income_median_burden_pct"]),
      pctAboveWhite: num(r["pct_above_white_households"]),
      pctHighBurden: num(r["pct_households_high_burden"]),
      dataYear: str(r["data_year"]) ?? "Year not stated",
      source: str(r["source"]) ?? "Source",
      sourceUrl: url,
      scope: str(r["study_scope"]),
      measure: str(r["burden_measure"]),
    };
    if (displayValue(row) === null) continue;
    out.push(row);
  }
  return out;
}

export type DisplayValue = { text: string; kind: "burden" | "gap" | "high" };

/** The one stored figure a row leads with, as text. Null when the row holds no usable number. */
export function displayValue(row: RaceReferenceRow): DisplayValue | null {
  if (row.burdenPct !== null) return { text: `${row.burdenPct}% of income`, kind: "burden" };
  if (row.lowIncomeMedianPct !== null)
    return { text: `${row.lowIncomeMedianPct}% of income`, kind: "burden" };
  if (row.pctAboveWhite !== null)
    return { text: `${row.pctAboveWhite}% higher burden than white households`, kind: "gap" };
  if (row.pctHighBurden !== null)
    return { text: `${row.pctHighBurden}% of households above the high-burden line`, kind: "high" };
  return null;
}

const RACE_ORDER = ["black", "hispanic", "native", "white", "all households", "low-income"];

function raceRank(name: string): number {
  const n = name.toLowerCase();
  const i = RACE_ORDER.findIndex((k) => n.startsWith(k));
  return i === -1 ? RACE_ORDER.length : i;
}

/** Groups rows by stored study scope; unlabeled rows go last. Row order inside a group is stable. */
export function groupRaceReference(rows: RaceReferenceRow[]): RaceReferenceGroup[] {
  const byScope = new Map<string | null, RaceReferenceRow[]>();
  for (const row of rows) {
    const list = byScope.get(row.scope) ?? [];
    list.push(row);
    byScope.set(row.scope, list);
  }
  const groups: RaceReferenceGroup[] = Array.from(byScope.entries()).map(([scope, list]) => ({
    scope,
    rows: [...list].sort(
      (a, b) => raceRank(a.raceEthnicity) - raceRank(b.raceEthnicity) || a.id - b.id,
    ),
  }));
  return groups.sort((a, b) => {
    if (a.scope === null) return 1;
    if (b.scope === null) return -1;
    return a.scope.localeCompare(b.scope);
  });
}

export async function fetchRaceReference(signal?: AbortSignal): Promise<RaceReferenceRow[] | null> {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !key) return null;
  // select=* so the optional scope/measure columns are read when they exist and ignored when not.
  const query = new URLSearchParams({ select: "*", order: "id.asc", limit: "500" });
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/energy_burden_by_race?${query}`, {
    headers: { apikey: key, Accept: "application/json" },
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`Race reference request failed (${res.status})`);
  return parseRaceReference(await res.json());
}
