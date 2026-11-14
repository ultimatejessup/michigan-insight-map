// County population and income from the Census Bureau's American Community Survey (ACS) 5-year
// estimates, stored in geo_demographics. Stored values only: nothing is computed here.
// Margins of error are not stored, so none are shown.

export const ACS_SOURCE = {
  label: "U.S. Census Bureau, American Community Survey 5-year estimates",
  url: "https://www.census.gov/programs-surveys/acs",
} as const;

export type CountyProfile = {
  county: string;
  dataYear: number;
  population: number | null;
  medianHouseholdIncome: number | null;
  /** Share of residents who are Black, in percent (stored value, e.g. 37.2). */
  blackSharePct: number | null;
};

function countyKey(name: string): string {
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

/** Keeps the newest year per county. Rows with an unusable year or name are dropped. */
export function parseCountyProfiles(rows: unknown): Map<string, CountyProfile> {
  const map = new Map<string, CountyProfile>();
  if (!Array.isArray(rows)) return map;
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const geo = r["geographies"];
    const name =
      typeof geo === "object" && geo !== null ? (geo as Record<string, unknown>)["name"] : null;
    const year = num(r["data_year"]);
    if (typeof name !== "string" || year === null) continue;
    const key = countyKey(name);
    const existing = map.get(key);
    if (existing && existing.dataYear >= year) continue;
    const race = r["geo_demographics_race"];
    const black = Array.isArray(race)
      ? race.find(
          (x): x is Record<string, unknown> =>
            typeof x === "object" &&
            x !== null &&
            (x as Record<string, unknown>)["race_category"] === "Black",
        )
      : undefined;
    map.set(key, {
      county: name,
      dataYear: year,
      population: num(r["total_population"]),
      medianHouseholdIncome: num(r["median_household_income"]),
      blackSharePct: black ? num(black["pct_of_population"]) : null,
    });
  }
  return map;
}

export function profileForCounty(
  profiles: Map<string, CountyProfile>,
  county: string | null,
): CountyProfile | null {
  return county ? (profiles.get(countyKey(county)) ?? null) : null;
}

export async function fetchCountyProfiles(
  signal?: AbortSignal,
): Promise<Map<string, CountyProfile> | null> {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !key) return null;
  const query = new URLSearchParams({
    select:
      "data_year,total_population,median_household_income,geographies!inner(name,level,geoid)",
    "geographies.level": "eq.county",
    "geographies.geoid": "like.26*",
    limit: "1000",
  });
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/geo_demographics?${query}`, {
    headers: { apikey: key, Accept: "application/json" },
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`County profile request failed (${res.status})`);
  return parseCountyProfiles(await res.json());
}
