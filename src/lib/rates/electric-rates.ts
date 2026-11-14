/**
 * Electric rate history from the existing Supabase table `utility_rate_history_mi`.
 *
 * Rules this file follows (see roadmap.md "Tracker data spec"):
 *  - Stored values only. Nothing here averages, interpolates or computes a change.
 *  - `reading_date` is the date printed on the MPSC "Comparison of Average Rates" table.
 *  - Read-only, with the public (publishable) key from the browser. No server credentials.
 */

export const MPSC_SOURCE_LABEL = "MPSC Comparison of Average Rates for Michigan electric utilities";

/** The two utilities shown by default; the other six can be switched on. */
export const DEFAULT_UTILITIES = ["DTE Electric", "Consumers Energy"] as const;

/**
 * Owner decision (Nov 13, 2026): rows from before 2023 stay on the site and are labeled
 * "Data collection in progress" instead of being hidden. Set to true to hide any row that
 * has no source link (the stricter Oct 12 rule).
 */
export const HIDE_ROWS_WITHOUT_SOURCE_LINK = false;

export type VerificationStatus = "verified_mpsc_table" | "source_linked" | "collection_in_progress";

export type ElectricRatePoint = {
  utility: string;
  /** Table date, "YYYY-MM-DD" (first of the month). */
  readingDate: string;
  /** Cents per kWh, residential at 1,000 kWh, exactly as stored. */
  value: number;
  sourceUrl: string | null;
  status: VerificationStatus;
};

type RawRow = {
  utility?: unknown;
  reading_date?: unknown;
  residential_rate_cents_kwh?: unknown;
  source_url?: unknown;
  verification_status?: unknown;
};

const STATUS_LABELS: Record<VerificationStatus, string> = {
  verified_mpsc_table: "Checked against the MPSC table",
  source_linked: "Source linked",
  collection_in_progress: "Data collection in progress",
};

const STATUS_SHORT: Record<VerificationStatus, string> = {
  verified_mpsc_table: "Checked",
  source_linked: "Source linked",
  collection_in_progress: "Collection in progress",
};

export function statusLabel(status: VerificationStatus): string {
  return STATUS_LABELS[status];
}

export function statusShort(status: VerificationStatus): string {
  return STATUS_SHORT[status];
}

function toStatus(value: unknown): VerificationStatus {
  // Anything unknown or missing is shown as still in progress, never as checked.
  return value === "verified_mpsc_table" || value === "source_linked"
    ? value
    : "collection_in_progress";
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

/** Turn raw database rows into points. Drops rows without a usable date, utility or number. */
export function parseRateRows(rows: unknown): ElectricRatePoint[] {
  if (!Array.isArray(rows)) return [];
  const points: ElectricRatePoint[] = [];
  for (const row of rows as RawRow[]) {
    const date = typeof row.reading_date === "string" ? row.reading_date.slice(0, 10) : "";
    const value = Number(row.residential_rate_cents_kwh);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (typeof row.utility !== "string" || row.utility === "") continue;
    if (row.residential_rate_cents_kwh === null || !Number.isFinite(value)) continue;
    const sourceUrl = isHttpUrl(row.source_url) ? row.source_url : null;
    if (HIDE_ROWS_WITHOUT_SOURCE_LINK && !sourceUrl) continue;
    points.push({
      utility: row.utility,
      readingDate: date,
      value,
      sourceUrl,
      status: toStatus(row.verification_status),
    });
  }
  return points.sort((a, b) =>
    a.readingDate === b.readingDate
      ? a.utility.localeCompare(b.utility)
      : a.readingDate.localeCompare(b.readingDate),
  );
}

/** Utilities in the data, with the default two first and the rest alphabetical. */
export function utilityList(points: ElectricRatePoint[]): string[] {
  const all = Array.from(new Set(points.map((p) => p.utility)));
  const first = DEFAULT_UTILITIES.filter((u) => all.includes(u));
  const rest = all.filter((u) => !first.includes(u as (typeof DEFAULT_UTILITIES)[number])).sort();
  return [...first, ...rest];
}

/** The newest stored point for each utility (a lookup, not a calculation). */
export function latestByUtility(points: ElectricRatePoint[]): Map<string, ElectricRatePoint> {
  const latest = new Map<string, ElectricRatePoint>();
  for (const p of points) {
    const current = latest.get(p.utility);
    if (!current || p.readingDate > current.readingDate) latest.set(p.utility, p);
  }
  return latest;
}

export type ChartRow = { date: string } & Record<string, number | string | undefined>;

/** One row per table date, one column per selected utility, for the line chart. */
export function pivotForChart(points: ElectricRatePoint[], selected: string[]): ChartRow[] {
  const keep = new Set(selected);
  const byDate = new Map<string, ChartRow>();
  for (const p of points) {
    if (!keep.has(p.utility)) continue;
    const row = byDate.get(p.readingDate) ?? { date: p.readingDate };
    row[p.utility] = p.value;
    byDate.set(p.readingDate, row);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** Status for one utility on one table date, or undefined when there is no point. */
export function statusAt(
  points: ElectricRatePoint[],
  utility: string,
  date: string,
): VerificationStatus | undefined {
  return points.find((p) => p.utility === utility && p.readingDate === date)?.status;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-01" -> "Oct 1, 2026" (no time zone math). */
export function formatTableDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function hasCollectionInProgress(points: ElectricRatePoint[], selected: string[]): boolean {
  const keep = new Set(selected);
  return points.some((p) => keep.has(p.utility) && p.status === "collection_in_progress");
}

export function lastCollectionInProgressDate(points: ElectricRatePoint[]): string | null {
  const dates = points
    .filter((p) => p.status === "collection_in_progress")
    .map((p) => p.readingDate);
  return dates.length ? dates.sort().at(-1)! : null;
}

const PAGE = 1000;

/** Read the Electric rows through the public REST endpoint. Returns null if not configured. */
export async function fetchElectricRates(
  signal?: AbortSignal,
): Promise<ElectricRatePoint[] | null> {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !key) return null;

  const rows: unknown[] = [];
  for (let offset = 0; offset < 20 * PAGE; offset += PAGE) {
    const query = new URLSearchParams({
      select: "utility,reading_date,residential_rate_cents_kwh,source_url,verification_status",
      service_type: "eq.Electric",
      order: "reading_date.asc,utility.asc",
      limit: String(PAGE),
      offset: String(offset),
    });
    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/utility_rate_history_mi?${query}`, {
      headers: { apikey: key, Accept: "application/json" },
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) throw new Error(`Rate history request failed (${res.status})`);
    const page = (await res.json()) as unknown[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return parseRateRows(rows);
}

// ---------------------------------------------------------------------------
// Service territory (which rate-table utilities serve each county)
// Source: EIA-861 2025 Service_Territory, stored in electric_service_territory_mi.
// EIA lists counties where a utility has distribution equipment, so a utility can serve
// only part of a county. Only utilities that have an MPSC rate series are stored.
// ---------------------------------------------------------------------------

export type ServiceTerritory = Map<string, string[]>;

function countyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bcounty\b/g, "")
    .replace(/\bsaint\b/g, "st")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Turns the REST rows (`rate_history_utility`, embedded `geographies.name`) into county -> utilities. */
export function parseTerritoryRows(rows: unknown): ServiceTerritory {
  const map: ServiceTerritory = new Map();
  if (!Array.isArray(rows)) return map;
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const utility = r["rate_history_utility"];
    const geo = r["geographies"];
    const name =
      typeof geo === "object" && geo !== null ? (geo as Record<string, unknown>)["name"] : null;
    if (typeof utility !== "string" || typeof name !== "string") continue;
    const key = countyKey(name);
    const list = map.get(key) ?? [];
    if (!list.includes(utility)) list.push(utility);
    map.set(key, list);
  }
  return map;
}

/** Utilities that serve the county, or null when no county is selected or none is recorded. */
export function utilitiesForCounty(
  territory: ServiceTerritory,
  county: string | null,
): string[] | null {
  if (!county) return null;
  const list = territory.get(countyKey(county));
  return list && list.length > 0 ? list : null;
}

export async function fetchServiceTerritory(
  signal?: AbortSignal,
): Promise<ServiceTerritory | null> {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !key) return null;
  const query = new URLSearchParams({
    select: "rate_history_utility,geographies!inner(name)",
    limit: "1000",
  });
  const res = await fetch(
    `${url.replace(/\/$/, "")}/rest/v1/electric_service_territory_mi?${query}`,
    { headers: { apikey: key, Accept: "application/json" }, ...(signal ? { signal } : {}) },
  );
  if (!res.ok) throw new Error(`Service territory request failed (${res.status})`);
  return parseTerritoryRows(await res.json());
}
