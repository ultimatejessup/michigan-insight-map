/**
 * Source lists for the public Sources page. Static institutional sources are listed in code;
 * the per-row sources (rate actions, race studies, water systems) are read from the existing
 * Supabase tables so the page stays in step with the data. Links are grouped by website and
 * nothing is invented: a row without a valid http(s) link is not listed.
 */
export type SourceLink = { url: string; label: string };
export type HostGroup = { host: string; links: SourceLink[] };

export const STATIC_SOURCES: {
  topic: string;
  items: { name: string; note: string; url: string }[];
}[] = [
  {
    topic: "Electric rates and service areas",
    items: [
      {
        name: "Michigan Public Service Commission: electric rate comparison table",
        note: "Residential rate series by utility.",
        url: "https://www.michigan.gov/documents/mpsc/rates1_594951_7.pdf",
      },
      {
        name: "U.S. Energy Information Administration: Form EIA-861 (2025)",
        note: "Which regulated utilities serve which counties.",
        url: "https://www.eia.gov/electricity/data/eia861/",
      },
    ],
  },
  {
    topic: "Natural gas rates and service areas",
    items: [
      {
        name: "Michigan Public Service Commission: natural gas rate comparison",
        note: "Residential gas rates by utility, in Ccf or therms as published.",
        url: "https://www.michigan.gov/mpsc/-/media/Project/Websites/mpsc/consumer/nat-gas/gasrates.pdf",
      },
      {
        name: "Michigan Public Service Commission: natural gas rate books",
        note: "Municipalities served by each gas utility.",
        url: "https://www.michigan.gov/mpsc/consumer/natural-gas/data-price-info/natural-gas-rate-books",
      },
      {
        name: "U.S. Census Bureau: county subdivision gazetteer (2026)",
        note: "Used to match gas service municipalities to counties.",
        url: "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2026_Gazetteer/",
      },
    ],
  },
  {
    topic: "Energy burden",
    items: [
      {
        name: "U.S. Department of Energy: Low-Income Energy Affordability Data (LEAD)",
        note: "County energy burden by household income bracket.",
        url: "https://data.openei.org/submissions/6219",
      },
    ],
  },
  {
    topic: "Population and income",
    items: [
      {
        name: "U.S. Census Bureau: American Community Survey (5-year)",
        note: "Population, median household income and Black population share by county.",
        url: "https://www.census.gov/programs-surveys/acs",
      },
    ],
  },
  {
    topic: "Water service lines",
    items: [
      {
        name: "Michigan EGLE: Distribution System Materials Inventory (DSMI)",
        note: "Service line counts by material for each public water system, as submitted by the systems.",
        url: "https://www.michigan.gov/egle/about/organization/drinking-water-and-environmental-health/community-water-supply/lead-and-copper-rule/dsmi/dsmi-inventories",
      },
    ],
  },
  {
    topic: "Broadband",
    items: [
      {
        name: "Federal Communications Commission: Broadband Data Collection",
        note: "Fixed broadband availability by place.",
        url: "https://broadbandmap.fcc.gov/",
      },
    ],
  },
];

export function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Group links by website, de-duplicated by URL, hosts and links sorted. */
export function groupByHost(rows: { url: unknown; label: unknown }[]): HostGroup[] {
  const hosts = new Map<string, Map<string, string>>();
  for (const r of rows) {
    if (typeof r.url !== "string") continue;
    const url = r.url.trim();
    const host = hostOf(url);
    if (!host) continue;
    const label = typeof r.label === "string" && r.label.trim() !== "" ? r.label.trim() : url;
    const m = hosts.get(host) ?? new Map<string, string>();
    if (!m.has(url)) m.set(url, label);
    hosts.set(host, m);
  }
  return [...hosts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([host, m]) => ({
      host,
      links: [...m.entries()]
        .map(([url, label]) => ({ url, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    }));
}

async function getRows(
  table: string,
  select: string,
  signal?: AbortSignal,
): Promise<unknown[] | null> {
  const base = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!base || !key) return null;
  const q = new URLSearchParams({ select, limit: "1000" });
  const res = await fetch(`${base.replace(/\/$/, "")}/rest/v1/${table}?${q}`, {
    headers: { apikey: key, Accept: "application/json" },
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`${table} request failed (${res.status})`);
  const json = (await res.json()) as unknown;
  return Array.isArray(json) ? json : null;
}

function pick(rows: unknown[], urlKey: string, labelKey: string) {
  return rows.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return { url: o[urlKey], label: o[labelKey] };
  });
}

export type DataSources = {
  rateActions: HostGroup[];
  raceStudies: HostGroup[];
  water: HostGroup[];
};

export async function fetchDataSources(signal?: AbortSignal): Promise<DataSources | null> {
  const [actions, race, water] = await Promise.all([
    getRows("mpsc_rate_actions", "source_url,action_title", signal),
    getRows("energy_burden_by_race", "source_url,source", signal),
    getRows("water_sewage_rates", "source_document,provider", signal),
  ]);
  if (!actions && !race && !water) return null;
  return {
    rateActions: groupByHost(pick(actions ?? [], "source_url", "action_title")),
    raceStudies: groupByHost(pick(race ?? [], "source_url", "source")),
    water: groupByHost(pick(water ?? [], "source_document", "provider")),
  };
}
