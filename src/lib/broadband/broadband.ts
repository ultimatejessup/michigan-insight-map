/**
 * Fixed broadband availability by place from the existing Supabase table
 * `broadband_availability_rates` (FCC Broadband Data Collection, place summaries).
 * Stored values only: place figures are listed one by one and never averaged into a county number.
 */
import { countyKey } from "@/lib/census/energy-burden";

export const FIXED_TECHNOLOGIES = [
  "Fiber",
  "Cable",
  "All Fixed Wireless",
  "All Satellite",
  "Any Technology",
] as const;
export type FixedTechnology = (typeof FIXED_TECHNOLOGIES)[number];

export type BroadbandPlace = {
  place: string;
  /** Percent as stored, by technology. A missing key means no stored value. */
  values: Partial<Record<FixedTechnology, number>>;
};

export type CountyBroadband = {
  places: BroadbandPlace[];
  /** "YYYY-MM-DD" from the stored source description, or null if it does not state one. */
  asOf: string | null;
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** county key -> broadband for that county's sampled places. */
export function parseBroadbandRows(rows: unknown): Map<string, CountyBroadband> {
  const map = new Map<string, CountyBroadband>();
  if (!Array.isArray(rows)) return map;
  const wanted = new Set<string>(FIXED_TECHNOLOGIES);
  const index = new Map<string, BroadbandPlace>();
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const tech = r["technology"];
    const pct = num(r["availability_pct_of_zip"]);
    const place = nameOf(r["place"]);
    const county = nameOf(r["county"]);
    if (typeof tech !== "string" || !wanted.has(tech) || pct === null || !place || !county)
      continue;
    const ck = countyKey(county);
    const entry = map.get(ck) ?? { places: [], asOf: null };
    const doc = r["source_document"];
    const m = typeof doc === "string" ? /as-of (\d{4}-\d{2}-\d{2})/.exec(doc) : null;
    if (m?.[1] && (entry.asOf === null || m[1] > entry.asOf)) entry.asOf = m[1];
    const pk = `${ck}|${place}`;
    let p = index.get(pk);
    if (!p) {
      p = { place, values: {} };
      index.set(pk, p);
      entry.places.push(p);
    }
    p.values[tech as FixedTechnology] = pct;
    map.set(ck, entry);
  }
  for (const entry of map.values()) entry.places.sort((a, b) => a.place.localeCompare(b.place));
  return map;
}

function nameOf(v: unknown): string | null {
  if (typeof v !== "object" || v === null) return null;
  const n = (v as Record<string, unknown>)["name"];
  return typeof n === "string" && n !== "" ? n : null;
}

export function broadbandForCounty(
  map: Map<string, CountyBroadband>,
  county: string | null,
): CountyBroadband | null {
  return county ? (map.get(countyKey(county)) ?? null) : null;
}

const PAGE = 1000;

export async function fetchBroadband(
  signal?: AbortSignal,
): Promise<Map<string, CountyBroadband> | null> {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !key) return null;
  const techList = FIXED_TECHNOLOGIES.map((t) => `"${t}"`).join(",");
  const rows: unknown[] = [];
  for (let offset = 0; offset < 20 * PAGE; offset += PAGE) {
    const query = new URLSearchParams({
      select:
        "technology,availability_pct_of_zip,source_document,place:geographies!place_geography_id(name),county:geographies!county_geography_id(name)",
      technology: `in.(${techList})`,
      source_document: "ilike.*fixed*",
      order: "id.asc",
      limit: String(PAGE),
      offset: String(offset),
    });
    const res = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/broadband_availability_rates?${query}`,
      { headers: { apikey: key, Accept: "application/json" }, ...(signal ? { signal } : {}) },
    );
    if (!res.ok) throw new Error(`Broadband request failed (${res.status})`);
    const page = (await res.json()) as unknown[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return parseBroadbandRows(rows);
}
