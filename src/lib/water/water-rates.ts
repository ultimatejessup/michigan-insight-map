/**
 * Water and sewer rates from the existing Supabase tables `water_sewage_rates` and
 * `water_sewage_service_counties`. Stored values only: nothing is averaged, estimated or compared.
 *
 * Michigan water and sewer rates are set by hundreds of local systems and only a few are loaded,
 * so a county with no row means "not collected yet", never "no charge".
 */
import { countyKey } from "@/lib/census/energy-burden";

export type WaterRate = {
  id: string;
  provider: string;
  serviceType: string | null;
  serviceArea: string | null;
  effectiveDate: string | null;
  customerCharge: number | null;
  waterRate: number | null;
  waterUnit: string | null;
  sewerRate: number | null;
  sewerUnit: string | null;
  stormwaterCharge: number | null;
  typicalUsage: number | null;
  typicalUsageUnit: string | null;
  /** Stored estimate of a typical monthly bill, in dollars. */
  estimatedBill: number | null;
  completeness: string | null;
  sourceUrl: string | null;
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function text(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export function parseWaterRates(rows: unknown): WaterRate[] {
  if (!Array.isArray(rows)) return [];
  const out: WaterRate[] = [];
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const id = r["id"] === null || r["id"] === undefined ? null : String(r["id"]);
    const provider = text(r["provider"]);
    if (id === null || provider === null) continue;
    const url = text(r["source_document"]);
    const date = text(r["effective_date"]);
    out.push({
      id,
      provider,
      serviceType: text(r["service_type"]),
      serviceArea: text(r["municipality_service_area"]),
      effectiveDate: date && /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : null,
      customerCharge: num(r["customer_charge_monthly"]),
      waterRate: num(r["water_commodity_rate"]),
      waterUnit: text(r["water_commodity_unit"]),
      sewerRate: num(r["sewage_commodity_rate"]),
      sewerUnit: text(r["sewage_commodity_unit"]),
      stormwaterCharge: num(r["stormwater_charge_monthly"]),
      typicalUsage: num(r["typical_residential_usage_monthly"]),
      typicalUsageUnit: text(r["typical_usage_unit"]),
      estimatedBill: num(r["estimated_typical_monthly_bill"]),
      completeness: text(r["data_completeness"]),
      sourceUrl: url && /^https?:\/\//i.test(url) ? url : null,
    });
  }
  return out;
}

/** county key -> rate ids (primary service county first). */
export type WaterCounties = Map<string, { rateId: string; primary: boolean }[]>;

export function parseWaterCounties(rows: unknown): WaterCounties {
  const map: WaterCounties = new Map();
  if (!Array.isArray(rows)) return map;
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const geo = r["geographies"];
    const name =
      typeof geo === "object" && geo !== null ? (geo as Record<string, unknown>)["name"] : null;
    const rateId = r["water_sewage_rate_id"];
    if (typeof name !== "string" || rateId === null || rateId === undefined) continue;
    const key = countyKey(name);
    const list = map.get(key) ?? [];
    list.push({ rateId: String(rateId), primary: r["is_primary"] === true });
    map.set(key, list);
  }
  for (const list of map.values()) list.sort((a, b) => Number(b.primary) - Number(a.primary));
  return map;
}

export function waterForCounty(
  rates: WaterRate[],
  counties: WaterCounties,
  county: string | null,
): WaterRate[] {
  if (!county) return [];
  const links = counties.get(countyKey(county)) ?? [];
  const byId = new Map(rates.map((r) => [r.id, r]));
  return links.flatMap((l) => {
    const rate = byId.get(l.rateId);
    return rate ? [rate] : [];
  });
}

async function getJson(table: string, select: string, signal?: AbortSignal) {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !key) return null;
  const query = new URLSearchParams({ select, limit: "1000" });
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Accept: "application/json" },
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`${table} request failed (${res.status})`);
  return (await res.json()) as unknown;
}

export async function fetchWaterRates(signal?: AbortSignal): Promise<WaterRate[] | null> {
  const rows = await getJson("water_sewage_rates", "*", signal);
  return rows === null ? null : parseWaterRates(rows);
}

export async function fetchWaterCounties(signal?: AbortSignal): Promise<WaterCounties | null> {
  const rows = await getJson(
    "water_sewage_service_counties",
    "water_sewage_rate_id,is_primary,geographies!inner(name)",
    signal,
  );
  return rows === null ? null : parseWaterCounties(rows);
}
