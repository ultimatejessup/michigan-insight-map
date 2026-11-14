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
  DEFAULT_UTILITIES,
  MPSC_SOURCE_LABEL,
  fetchElectricRates,
  formatTableDate,
  hasCollectionInProgress,
  lastCollectionInProgressDate,
  latestByUtility,
  pivotForChart,
  statusAt,
  statusLabel,
  statusShort,
  utilityList,
  type ElectricRatePoint,
} from "@/lib/rates/electric-rates";

const UNIT = "¢/kWh";

// Blue and orange match the site's primary and accent colors; the rest are distinct and readable.
const COLORS: Record<string, string> = {
  "DTE Electric": "#1d4f91",
  "Consumers Energy": "#d9650a",
};
const FALLBACK_COLORS = ["#2a7f62", "#7a4fa3", "#8a6d00", "#b0306a", "#4b5563", "#0e7490"];

function colorFor(utility: string, index: number): string {
  return COLORS[utility] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length] ?? "#4b5563";
}

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

function CurrentRateCard({
  utility,
  point,
}: {
  utility: string;
  point: ElectricRatePoint | undefined;
}) {
  // A figure is only shown with a source link; otherwise it is hidden.
  const shown = point && point.sourceUrl ? point : undefined;
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Latest rate · {utility}
      </p>
      {shown ? (
        <>
          <p className="mt-1 font-display text-xl font-bold text-primary">
            {shown.value.toFixed(2)} {UNIT}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Residential, 1,000 kWh a month. MPSC table dated {formatTableDate(shown.readingDate)}.
          </p>
          <SourceLine
            source={{
              label: `${MPSC_SOURCE_LABEL} (table dated ${formatTableDate(shown.readingDate)})`,
              url: shown.sourceUrl!,
            }}
          />
          <p className="mt-1 text-xs font-medium text-primary">{statusLabel(shown.status)}</p>
        </>
      ) : (
        <>
          <p className="mt-1 font-display text-xl font-bold text-primary">Source pending</p>
          <SourceLine source={null} />
        </>
      )}
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  label?: string;
  payload?: { dataKey?: string; value?: number; color?: string }[];
};

export function ElectricRateHistory({ county }: { county: string | null }) {
  const query = useQuery({
    queryKey: ["electric-rate-history"],
    queryFn: ({ signal }) => fetchElectricRates(signal),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const points = useMemo(() => query.data ?? [], [query.data]);
  const utilities = useMemo(() => utilityList(points), [points]);
  const latest = useMemo(() => latestByUtility(points), [points]);
  const [extra, setExtra] = useState<string[]>([]);

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

  const selected = [...DEFAULT_UTILITIES.filter((u) => utilities.includes(u)), ...extra];
  const others = utilities.filter((u) => !(DEFAULT_UTILITIES as readonly string[]).includes(u));
  const rows = pivotForChart(points, selected);
  if (rows.length === 0) {
    return (
      <Notice title="Data not yet loaded">
        No electric rate history is available for the selected utilities. No figure is shown.
      </Notice>
    );
  }
  const sourceUrl =
    (selected[0] ? latest.get(selected[0])?.sourceUrl : undefined) ??
    points.find((p) => p.sourceUrl)?.sourceUrl ??
    null;
  const newest = points.at(-1)?.readingDate ?? "";
  const inProgressThrough = lastCollectionInProgressDate(points);
  const showProgressNote = hasCollectionInProgress(points, selected) && inProgressThrough;
  const yearTicks = rows.filter((r) => r.date.endsWith("-01-01")).map((r) => r.date);

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
      <div className="grid gap-3 sm:grid-cols-2">
        {DEFAULT_UTILITIES.map((u) => (
          <CurrentRateCard key={u} utility={u} point={latest.get(u)} />
        ))}
      </div>

      <section aria-label="Electric rate history chart">
        <h3 className="font-display text-base font-bold">Electric rate history</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Monthly residential rate at 1,000 kWh, in {UNIT}, as published by the Michigan Public
          Service Commission. Values are shown exactly as published.
          {county
            ? " Electric rates are published by utility, so these figures are the same in every county."
            : ""}
        </p>

        <div
          className="mt-3 h-72 w-full rounded-lg border bg-card p-2"
          role="img"
          aria-label={`Line chart of monthly residential electric rates for ${selected.join(" and ")} from ${formatTableDate(rows[0]?.date ?? newest)} to ${formatTableDate(newest)}`}
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
              {selected.map((u, i) => (
                <Line
                  key={u}
                  type="monotone"
                  dataKey={u}
                  stroke={colorFor(u, i)}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {others.length > 0 && (
          <fieldset className="mt-3">
            <legend className="text-sm font-semibold">Add another utility to the chart</legend>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {others.map((u) => {
                const id = `rate-util-${u.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
                return (
                  <label key={u} htmlFor={id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id={id}
                      checked={extra.includes(u)}
                      onCheckedChange={(on) =>
                        setExtra((cur) => (on === true ? [...cur, u] : cur.filter((x) => x !== u)))
                      }
                    />
                    {u}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

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
          Data is refreshed periodically, not in real time. Each month matches the date printed on
          the MPSC table.
        </p>
        {showProgressNote && (
          <p className="mt-1 text-xs text-muted-foreground">
            Data collection in progress: figures through {formatTableDate(inProgressThrough)} are
            stored values that have not yet been checked against a published MPSC table.
          </p>
        )}
      </section>

      <section
        aria-label="Latest rates for every regulated utility"
        className="rounded-lg border bg-surface p-4"
      >
        <h3 className="font-display text-base font-bold">Latest published rates, all utilities</h3>
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
                      {u}
                    </th>
                    <td className="py-1 pr-3">
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
        <p className="mt-2 text-xs text-muted-foreground">
          Change over time is not calculated here. Only values published by the MPSC are shown.
        </p>
      </section>
    </div>
  );
}
