// County energy burden from the DOE LEAD Tool, stored in energy_burden_lead_mi.
// Stored values only: nothing is averaged, ranked or compared here.

export type BurdenRow = {
  bracket: string;
  households: number | null;
  avgIncome: number | null;
  avgEnergyCost: number | null;
  burdenPct: number | null;
};

export type CountyBurden = {
  county: string;
  dataYear: number;
  sourceUrl: string | null;
  sourceDocument: string | null;
  all: BurdenRow | null;
  brackets: BurdenRow[];
};

/** Lowest income first. "ALL" is the county-wide figure and is kept separate. */
const BRACKET_ORDER = ["0-100%", "100-150%", "150-200%", "200-400%", "400%+"];

export function countyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bcounty\b/g, "")
    .replace(/\bsaint\b/g, "st")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseBurdenRows(rows: unknown): Map<string, CountyBurden> {
  const map = new Map<string, CountyBurden>();
  if (!Array.isArray(rows)) return map;
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const geo = r["geographies"];
    const name =
      typeof geo === "object" && geo !== null ? (geo as Record<string, unknown>)["name"] : null;
    const bracket = r["fpl_bracket"];
    const year = num(r["data_year"]);
    if (typeof name !== "string" || typeof bracket !== "string" || year === null) continue;
    const key = countyKey(name);
    const entry: CountyBurden = map.get(key) ?? {
      county: name,
      dataYear: year,
      sourceUrl: null,
      sourceDocument: null,
      all: null,
      brackets: [],
    };
    const url = r["source_url"];
    const doc = r["source_document"];
    if (typeof url === "string" && /^https?:\/\//i.test(url)) entry.sourceUrl = url;
    if (typeof doc === "string") entry.sourceDocument = doc;
    const row: BurdenRow = {
      bracket,
      households: num(r["estimated_households"]),
      avgIncome: num(r["avg_annual_household_income"]),
      avgEnergyCost: num(r["avg_annual_energy_cost"]),
      burdenPct: num(r["energy_burden_pct"]),
    };
    if (bracket === "ALL") entry.all = row;
    else entry.brackets.push(row);
    map.set(key, entry);
  }
  for (const entry of map.values()) {
    entry.brackets.sort(
      (a, b) => BRACKET_ORDER.indexOf(a.bracket) - BRACKET_ORDER.indexOf(b.bracket),
    );
  }
  return map;
}

export function burdenForCounty(
  map: Map<string, CountyBurden>,
  county: string | null,
): CountyBurden | null {
  return county ? (map.get(countyKey(county)) ?? null) : null;
}

export async function fetchEnergyBurden(
  signal?: AbortSignal,
): Promise<Map<string, CountyBurden> | null> {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !key) return null;
  const query = new URLSearchParams({
    select:
      "fpl_bracket,estimated_households,avg_annual_household_income,avg_annual_energy_cost,energy_burden_pct,data_year,source_url,source_document,geographies!inner(name)",
    limit: "1000",
  });
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/energy_burden_lead_mi?${query}`, {
    headers: { apikey: key, Accept: "application/json" },
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`Energy burden request failed (${res.status})`);
  return parseBurdenRows(await res.json());
}
