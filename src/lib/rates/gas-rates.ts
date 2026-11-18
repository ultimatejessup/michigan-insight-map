/**
 * Natural gas rates and service territory from the existing Supabase tables
 * `gas_rate_history_mi` and `gas_service_territory_mi`.
 *
 * Same rules as electric-rates.ts:
 *  - Stored values only. Nothing here averages, converts units or computes a change.
 *  - `reading_date` is the edition date printed on the MPSC "Residential Rate Comparisons".
 *  - Read-only, with the public (publishable) key from the browser.
 *
 * Units are exactly as the MPSC prints them: Ccf for Consumers Energy, DTE Gas and Michigan Gas
 * Utilities; therm for SEMCO, UMERC and Xcel. They are never converted or put side by side.
 */
import { countyKey } from "@/lib/census/energy-burden";
import type { VerificationStatus } from "./electric-rates";

export const GAS_SOURCE_LABEL = "MPSC Residential Rate Comparisons (natural gas)";

export type GasUnit = "Ccf" | "Therm";

export type GasRatePoint = {
  utility: string;
  /** Edition date, "YYYY-MM-DD". */
  readingDate: string;
  /** Monthly customer charge in dollars, as stored. */
  customerCharge: number | null;
  /** Dollars per unit, as stored. */
  distribution: number | null;
  gasCost: number | null;
  total: number | null;
  unit: GasUnit;
  sourceUrl: string | null;
  status: VerificationStatus;
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStatus(value: unknown): VerificationStatus {
  // Anything unknown or missing is shown as still in progress, never as checked.
  return value === "verified_mpsc_table" || value === "source_linked"
    ? value
    : "collection_in_progress";
}

export function parseGasRateRows(rows: unknown): GasRatePoint[] {
  if (!Array.isArray(rows)) return [];
  const points: GasRatePoint[] = [];
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const date = typeof r["reading_date"] === "string" ? r["reading_date"].slice(0, 10) : "";
    const unit = r["volumetric_unit"];
    const utility = r["gas_utility"];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (typeof utility !== "string" || utility === "") continue;
    if (unit !== "Ccf" && unit !== "Therm") continue;
    const total = num(r["total_volumetric_charge"]);
    if (total === null) continue;
    const url = r["source_url"];
    points.push({
      utility,
      readingDate: date,
      customerCharge: num(r["customer_charge_monthly"]),
      distribution: num(r["distribution_charge"]),
      gasCost: num(r["gas_cost_charge"]),
      total,
      unit,
      sourceUrl: typeof url === "string" && /^https?:\/\//i.test(url) ? url : null,
      status: toStatus(r["verification_status"]),
    });
  }
  return points.sort((a, b) =>
    a.readingDate === b.readingDate
      ? a.utility.localeCompare(b.utility)
      : a.readingDate.localeCompare(b.readingDate),
  );
}

/** The newest stored point for each utility (a lookup, not a calculation). */
export function latestGasByUtility(points: GasRatePoint[]): Map<string, GasRatePoint> {
  const latest = new Map<string, GasRatePoint>();
  for (const p of points) {
    const current = latest.get(p.utility);
    if (!current || p.readingDate > current.readingDate) latest.set(p.utility, p);
  }
  return latest;
}

// ---------------------------------------------------------------------------
// Service territory. Stored per municipality; a gas utility can serve only some
// communities in a county, so a county lists every utility with at least one.
// ---------------------------------------------------------------------------

export type GasTerritory = Map<string, string[]>;

export function parseGasTerritoryRows(rows: unknown): GasTerritory {
  const map: GasTerritory = new Map();
  if (!Array.isArray(rows)) return map;
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const utility = r["gas_utility"];
    const geo = r["geographies"];
    const name =
      typeof geo === "object" && geo !== null ? (geo as Record<string, unknown>)["name"] : null;
    if (typeof utility !== "string" || typeof name !== "string") continue;
    const key = countyKey(name);
    const list = map.get(key) ?? [];
    if (!list.includes(utility)) list.push(utility);
    map.set(key, list);
  }
  for (const list of map.values()) list.sort();
  return map;
}

export function gasUtilitiesForCounty(
  territory: GasTerritory,
  county: string | null,
): string[] | null {
  if (!county) return null;
  const list = territory.get(countyKey(county));
  return list && list.length > 0 ? list : null;
}

const PAGE = 1000;

async function getAll(table: string, select: string, order: string, signal?: AbortSignal) {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !key) return null;
  const rows: unknown[] = [];
  // Supabase returns at most 1,000 rows a request, and the territory table has more than that.
  for (let offset = 0; offset < 20 * PAGE; offset += PAGE) {
    const query = new URLSearchParams({
      select,
      order,
      limit: String(PAGE),
      offset: String(offset),
    });
    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${table}?${query}`, {
      headers: { apikey: key, Accept: "application/json" },
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) throw new Error(`${table} request failed (${res.status})`);
    const page = (await res.json()) as unknown[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

export async function fetchGasRates(signal?: AbortSignal): Promise<GasRatePoint[] | null> {
  const rows = await getAll(
    "gas_rate_history_mi",
    "gas_utility,reading_date,customer_charge_monthly,distribution_charge,gas_cost_charge,total_volumetric_charge,volumetric_unit,source_url,verification_status",
    "reading_date.asc,gas_utility.asc",
    signal,
  );
  return rows === null ? null : parseGasRateRows(rows);
}

export async function fetchGasTerritory(signal?: AbortSignal): Promise<GasTerritory | null> {
  const rows = await getAll(
    "gas_service_territory_mi",
    "gas_utility,geographies!inner(name)",
    "id.asc",
    signal,
  );
  return rows === null ? null : parseGasTerritoryRows(rows);
}

// ---------------------------------------------------------------------------
// Chart helpers. Still lookups and reshaping only: no averages, conversions or changes.
// ---------------------------------------------------------------------------

/** Utilities in the data, alphabetical. */
export function gasUtilityList(points: GasRatePoint[]): string[] {
  return Array.from(new Set(points.map((p) => p.utility))).sort();
}

/** Splits utilities by the unit the MPSC prints for them, so Ccf and therm are never plotted together. */
export function gasUnitGroups(
  points: GasRatePoint[],
  utilities: string[],
): Record<GasUnit, string[]> {
  const latest = latestGasByUtility(points);
  const groups: Record<GasUnit, string[]> = { Ccf: [], Therm: [] };
  for (const u of utilities) {
    const unit = latest.get(u)?.unit;
    if (unit) groups[unit].push(u);
  }
  return groups;
}

export type GasChartRow = { date: string } & Record<string, number | string | undefined>;

/** One row per edition date, one column per selected utility (total charge per unit). */
export function pivotGasForChart(points: GasRatePoint[], selected: string[]): GasChartRow[] {
  const keep = new Set(selected);
  const byDate = new Map<string, GasChartRow>();
  for (const p of points) {
    if (!keep.has(p.utility) || p.total === null) continue;
    const row = byDate.get(p.readingDate) ?? { date: p.readingDate };
    row[p.utility] = p.total;
    byDate.set(p.readingDate, row);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function gasPointAt(
  points: GasRatePoint[],
  utility: string,
  date: string,
): GasRatePoint | undefined {
  return points.find((p) => p.utility === utility && p.readingDate === date);
}
