/**
 * EGLE Distribution System Materials Inventory (DSMI): service line counts by public water supply,
 * from `water_service_line_inventory`. Stored values only. Blank cells in the source stay blank
 * (null); nothing is summed, estimated or filled in. County placement comes from
 * `water_service_line_county` and only means the supply's name matched that county's city or
 * township, not that the supply serves only that county.
 */
import { countyKey } from "@/lib/census/energy-burden";

export const DSMI_SOURCE_URL =
  "https://www.michigan.gov/egle/about/organization/drinking-water-and-environmental-health/community-water-supply/lead-and-copper-rule/dsmi/dsmi-inventories";

export type ServiceLineSupply = {
  pwsId: string;
  name: string;
  lead: number | null;
  galvanized: number | null;
  nonLead: number | null;
  unknown: number | null;
  total: number | null;
  asOf: string;
  sourceUrl: string;
};

function int(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseSupplies(rows: unknown): ServiceLineSupply[] {
  if (!Array.isArray(rows)) return [];
  const out: ServiceLineSupply[] = [];
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const pwsId = r["pws_id"];
    const name = r["supply_name"];
    if (typeof pwsId !== "string" || typeof name !== "string" || name.trim() === "") continue;
    const url = r["source_url"];
    out.push({
      pwsId,
      name: name.trim(),
      lead: int(r["lead_lines"]),
      galvanized: int(r["galvanized_prev_lead_lines"]),
      nonLead: int(r["non_lead_lines"]),
      unknown: int(r["lead_status_unknown_lines"]),
      total: int(r["total_service_lines"]),
      asOf: typeof r["as_of"] === "string" ? r["as_of"] : "",
      sourceUrl: typeof url === "string" && /^https?:\/\//i.test(url) ? url : DSMI_SOURCE_URL,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** county key -> pws ids placed there by name match. */
export function parseCounty(rows: unknown): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!Array.isArray(rows)) return map;
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const geo = r["geographies"];
    const name =
      typeof geo === "object" && geo !== null ? (geo as Record<string, unknown>)["name"] : null;
    const id = r["pws_id"];
    if (typeof name !== "string" || typeof id !== "string") continue;
    const key = countyKey(name);
    map.set(key, [...(map.get(key) ?? []), id]);
  }
  return map;
}

export function suppliesForCounty(
  supplies: ServiceLineSupply[],
  county: Map<string, string[]>,
  name: string | null,
): ServiceLineSupply[] {
  if (!name) return [];
  const ids = new Set(county.get(countyKey(name)) ?? []);
  return supplies.filter((s) => ids.has(s.pwsId));
}

export function filterSupplies(supplies: ServiceLineSupply[], query: string): ServiceLineSupply[] {
  const q = query.trim().toLowerCase();
  if (!q) return supplies;
  return supplies.filter(
    (s) => s.name.toLowerCase().includes(q) || s.pwsId.toLowerCase().includes(q),
  );
}

const CSV_HEADER = [
  "Public Water Supply ID",
  "Supply name",
  "Lead",
  "Galvanized previously connected to lead",
  "Non-lead",
  "Lead status unknown",
  "Total service lines",
  "As of",
  "Source",
];

function cell(v: string | number | null): string {
  if (v === null) return "";
  let s = String(v);
  // Stop spreadsheet programs from running text that starts like a formula.
  if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with blanks left blank, exactly as stored. */
export function suppliesToCsv(supplies: ServiceLineSupply[]): string {
  const lines = [CSV_HEADER.map(cell).join(",")];
  for (const s of supplies)
    lines.push(
      [s.pwsId, s.name, s.lead, s.galvanized, s.nonLead, s.unknown, s.total, s.asOf, s.sourceUrl]
        .map(cell)
        .join(","),
    );
  return lines.join("\r\n") + "\r\n";
}

const PAGE = 1000;

async function getAll(table: string, select: string, order: string, signal?: AbortSignal) {
  const base = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!base || !key) return null;
  const rows: unknown[] = [];
  for (let offset = 0; offset < 20 * PAGE; offset += PAGE) {
    const q = new URLSearchParams({ select, order, limit: String(PAGE), offset: String(offset) });
    const res = await fetch(`${base.replace(/\/$/, "")}/rest/v1/${table}?${q}`, {
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

export async function fetchSupplies(signal?: AbortSignal): Promise<ServiceLineSupply[] | null> {
  const rows = await getAll("water_service_line_inventory", "*", "pws_id.asc", signal);
  return rows === null ? null : parseSupplies(rows);
}

/** Returns null if the crosswalk table is not available yet (county cards then say so). */
export async function fetchCounty(signal?: AbortSignal): Promise<Map<string, string[]> | null> {
  try {
    const rows = await getAll(
      "water_service_line_county",
      "pws_id,geographies!inner(name)",
      "id.asc",
      signal,
    );
    return rows === null ? null : parseCounty(rows);
  } catch {
    return null;
  }
}
