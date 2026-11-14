import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "@tanstack/react-router";
import { Checkbox } from "@/components/ui/checkbox";
import { SourceLine } from "./source-line";
import {
  MPSC_SOURCE_LABEL,
  fetchElectricRates,
  fetchServiceTerritory,
  formatTableDate,
  hasCollectionInProgress,
  lastCollectionInProgressDate,
  latestByUtility,
  pivotForChart,
  statusAt,
  statusLabel,
  statusShort,
  utilitiesForCounty,
  utilityList,
} from "@/lib/rates/electric-rates";

const UNIT = "¢/kWh";

// Blue and orange match the site's primary and accent colors; the rest are distinct and readable.
const COLORS: Record<string, string> = {
  "DTE Electric": "#1d4f91",
  "Consumers Energy": "#d9650a",
};
const FALLBACK_COLORS = ["#2a7f62", "#7a4fa3", "#8a6d00", "#b0306a", "#4b5563", "#0e7490"];

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed bg-surface p-6">
      <p className="font-display text-base font-bold text-primary">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
      <Link
        to="/survey"
        className="mt-4 inline-flex rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-strong hover:text-primary-foreground"
      >
        Tell us what you pay
      </Link>
      <SourceLine source={null} />
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  label?: string;
  payload?: { dataKey?: string; value?: number; color?: string }[];
};

/** Which utilities are shown, and why. Rendered above the utility-type tabs by the details panel. */
export function ElectricScopeNote({ county }: { county: string | null }) {
  const territoryQuery = useQuery({
    queryKey: ["electric-service-territory"],
    queryFn: ({ signal }) => fetchServiceTerritory(signal),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
  const countyUtilities = territoryQuery.data
    ? utilitiesForCounty(territoryQuery.data, county)
    : null;
  return (
    <p className="mt-3 rounded-lg border bg-surface p-3 text-sm text-muted-foreground">
      {county && countyUtilities
        ? `Showing the MPSC-regulated electric utilities that serve ${county} County. A utility may serve only part of the county, and a cooperative or municipal utility that is not in the MPSC rate table may serve your address. Check your bill for your utility's name.`
        : county
          ? `No MPSC-regulated utility is on record for ${county} County, so every utility is shown. Your electricity may come from a cooperative or municipal utility, which the MPSC rate table does not cover. Check your bill for your utility's name.`
          : "Every MPSC-regulated electric utility is shown. Each serves only part of Michigan, so select a county on the map or check your bill for your utility's name."}
    </p>
  );
}

export function ElectricRateHistory({ county }: { county: string | null }) {
  const query = useQuery({
    queryKey: ["electric-rate-history"],
    queryFn: ({ signal }) => fetchElectricRates(signal),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  // County service areas are optional: if they cannot be read, every utility is shown.
  const territoryQuery = useQuery({
    queryKey: ["electric-service-territory"],
    queryFn: ({ signal }) => fetchServiceTerritory(signal),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const points = useMemo(() => query.data ?? [], [query.data]);
  const allUtilities = useMemo(() => utilityList(points), [points]);
  const countyUtilities = useMemo(
    () => (territoryQuery.data ? utilitiesForCounty(territoryQuery.data, county) : null),
    [territoryQuery.data, county],
  );
  // With a county selected, show only the rate-table utilities that serve it.
  const utilities = useMemo(
    () =>
      countyUtilities ? allUtilities.filter((u) => countyUtilities.includes(u)) : allUtilities,
    [allUtilities, countyUtilities],
  );
  const latest = useMemo(() => latestByUtility(points), [points]);
  // Every regulated utility is shown by default; residents can switch any of them off.
  const [hidden, setHidden] = useState<string[]>([]);

  const colors = useMemo(() => {
    const map: Record<string, string> = { ...COLORS };
    let next = 0;
    for (const u of allUtilities) {
      if (!map[u]) {
        map[u] = FALLBACK_COLORS[next % FALLBACK_COLORS.length] ?? "#4b5563";
        next += 1;
      }
    }
    return map;
  }, [allUtilities]);

  if (query.isPending) {
    return (
      <p role="status" className="rounded-lg border bg-surface p-6 text-sm text-muted-foreground">
        Loading the electric rate history…
      </p>
    );
  }
  if (query.isError || query.data === null || points.length === 0) {
    return (
      <Notice title="Data not yet loaded">
        The monthly residential electric rate history is not available right now. No figure is shown
        until it can be read with its source.
      </Notice>
    );
  }

  const selected = utilities.filter((u) => !hidden.includes(u));
  const rows = pivotForChart(points, selected);
  const newest = points.at(-1)?.readingDate ?? "";
  const inProgressThrough = lastCollectionInProgressDate(points);
  const showProgressNote = hasCollectionInProgress(points, selected) && inProgressThrough;
  const yearTicks = rows.filter((r) => r.date.endsWith("-01-01")).map((r) => r.date);
  const sourceUrl = [...points].reverse().find((p) => p.sourceUrl)?.sourceUrl ?? null;

  const renderTooltip = ({ active, label, payload }: TooltipProps) => {
    if (!active || !payload || !label) return null;
    return (
      <div className="rounded-md border bg-card p-3 text-xs shadow-card">
        <p className="font-semibold text-foreground">MPSC table dated {formatTableDate(label)}</p>
        <ul className="mt-1 space-y-0.5">
          {payload.map((p) => {
            const name = String(p.dataKey);
            const status = statusAt(points, name, label);
            return (
              <li key={name} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span>
                  {name}: {Number(p.value).toFixed(2)} {UNIT}
                  {status ? ` · ${statusShort(status)}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <section
        aria-label="Latest rates for every regulated utility"
        className="rounded-lg border bg-card p-4"
      >
        <h3 className="font-display text-base font-bold">Latest published rates</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Residential, 1,000 kWh a month, in {UNIT}. MPSC table dated {formatTableDate(newest)}.
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Latest residential electric rate at 1,000 kWh for each MPSC-regulated utility
            </caption>
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="py-1 pr-3 font-semibold">
                  Utility
                </th>
                <th scope="col" className="py-1 pr-3 font-semibold">
                  {UNIT}
                </th>
                <th scope="col" className="py-1 pr-3 font-semibold">
                  MPSC table date
                </th>
                <th scope="col" className="py-1 font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {utilities.map((u) => {
                const p = latest.get(u);
                if (!p) return null;
                return (
                  <tr key={u} className="border-b last:border-0">
                    <th scope="row" className="py-1 pr-3 font-medium">
                      <span
                        aria-hidden
                        className="mr-2 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: colors[u] }}
                      />
                      {u}
                    </th>
                    <td className="py-1 pr-3 font-semibold text-primary">
                      {p.sourceUrl ? p.value.toFixed(2) : "Source pending"}
                    </td>
                    <td className="py-1 pr-3">{formatTableDate(p.readingDate)}</td>
                    <td className="py-1">{statusLabel(p.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <SourceLine
          source={
            sourceUrl
              ? {
                  label: `${MPSC_SOURCE_LABEL} (newest table dated ${formatTableDate(newest)})`,
                  url: sourceUrl,
                }
              : null
          }
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Change over time is not calculated here. Only values published by the MPSC are shown.
        </p>
      </section>

      <section aria-label="Electric rate history chart">
        <h3 className="font-display text-base font-bold">Electric rate history</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Monthly residential rate at 1,000 kWh, in {UNIT}, as published by the Michigan Public
          Service Commission. Values are shown exactly as published.
        </p>

        {rows.length === 0 ? (
          <p className="mt-3 rounded-lg border bg-surface p-4 text-sm text-muted-foreground">
            No utility is selected. Choose at least one below to see its history.
          </p>
        ) : (
          <div
            className="mt-3 h-80 w-full rounded-lg border bg-card p-2"
            role="img"
            aria-label={`Line chart of monthly residential electric rates for ${selected.join(", ")} from ${formatTableDate(rows[0]?.date ?? newest)} to ${formatTableDate(newest)}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d6dde8" />
                <XAxis
                  dataKey="date"
                  ticks={yearTicks}
                  tickFormatter={(d: string) => d.slice(0, 4)}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 12 }}
                  width={44}
                  tickFormatter={(v: number) => v.toFixed(0)}
                  label={{ value: UNIT, angle: -90, position: "insideLeft", fontSize: 12, dx: 4 }}
                />
                <Tooltip content={renderTooltip as never} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {selected.map((u) => (
                  <Line
                    key={u}
                    type="monotone"
                    dataKey={u}
                    stroke={colors[u]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <fieldset className="mt-3">
          <legend className="text-sm font-semibold">Utilities shown on the chart</legend>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {utilities.map((u) => {
              const id = `rate-util-${u.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
              return (
                <label key={u} htmlFor={id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id={id}
                    checked={!hidden.includes(u)}
                    onCheckedChange={(on) =>
                      setHidden((cur) => (on === true ? cur.filter((x) => x !== u) : [...cur, u]))
                    }
                  />
                  {u}
                </label>
              );
            })}
          </div>
        </fieldset>

        <p className="mt-2 text-xs text-muted-foreground">
          Data is refreshed periodically, not in real time. Each month matches the date printed on
          the MPSC table.
        </p>
        {showProgressNote && (
          <p className="mt-1 text-xs text-muted-foreground">
            Data collection in progress: figures through {formatTableDate(inProgressThrough)} are
            stored values that have not yet been checked against a published MPSC table.
          </p>
        )}
        {selected.includes("UMERC (formerly WEPCO)") &&
          selected.includes("UMERC (formerly WPSC)") && (
            <p className="mt-1 text-xs text-muted-foreground">
              Upper Michigan Energy Resources has two rate zones with different rates. In Menominee
              County the zone depends on your township, so check your bill to see which applies.
            </p>
          )}
      </section>
    </div>
  );
}
