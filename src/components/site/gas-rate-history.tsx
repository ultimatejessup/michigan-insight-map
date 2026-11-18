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
import { formatTableDate, statusLabel, statusShort } from "@/lib/rates/electric-rates";
import {
  GAS_SOURCE_LABEL,
  fetchGasRates,
  fetchGasTerritory,
  gasPointAt,
  gasUnitGroups,
  gasUtilitiesForCounty,
  gasUtilityList,
  latestGasByUtility,
  pivotGasForChart,
  type GasRatePoint,
  type GasUnit,
} from "@/lib/rates/gas-rates";

const UNIT_LABEL: Record<GasUnit, string> = { Ccf: "per Ccf", Therm: "per therm" };
const UNIT_NOTE: Record<GasUnit, string> = {
  Ccf: "Ccf is 100 cubic feet of gas.",
  Therm: "A therm is 100,000 BTU of gas.",
};

const COLORS: Record<string, string> = {
  "Consumers Energy Gas": "#d9650a",
  "DTE Gas": "#1d4f91",
  "Michigan Gas Utilities": "#2a7f62",
  "SEMCO Energy Gas": "#7a4fa3",
  "Upper Michigan Energy Resources": "#8a6d00",
  "Xcel Energy Gas": "#b0306a",
};

const usd = (n: number | null, digits: number) => (n === null ? "—" : `$${n.toFixed(digits)}`);

type TooltipProps = {
  active?: boolean;
  label?: string;
  payload?: { dataKey?: string; value?: number; color?: string }[];
};

function GasChart({
  unit,
  utilities,
  points,
}: {
  unit: GasUnit;
  utilities: string[];
  points: GasRatePoint[];
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const selected = utilities.filter((u) => !hidden.includes(u));
  const rows = pivotGasForChart(points, selected);
  const yearTicks = rows.filter((r) => r.date.endsWith("-01-01")).map((r) => r.date);
  const first = rows[0]?.date ?? "";
  const last = rows.at(-1)?.date ?? "";

  const renderTooltip = ({ active, label, payload }: TooltipProps) => {
    if (!active || !payload || !label) return null;
    return (
      <div className="rounded-md border bg-card p-3 text-xs shadow-card">
        <p className="font-semibold text-foreground">MPSC table dated {formatTableDate(label)}</p>
        <ul className="mt-1 space-y-1">
          {payload.map((p) => {
            const name = String(p.dataKey);
            const pt = gasPointAt(points, name, label);
            return (
              <li key={name}>
                <span
                  aria-hidden
                  className="mr-2 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                {name}: {usd(Number(p.value), 5)} {UNIT_LABEL[unit]}
                {pt ? ` · ${statusShort(pt.status)}` : ""}
                {pt && (
                  <span className="block pl-4 text-muted-foreground">
                    distribution {usd(pt.distribution, 5)} + gas cost {usd(pt.gasCost, 5)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const inProgress = points.filter(
    (p) => selected.includes(p.utility) && p.status === "collection_in_progress",
  );
  const inProgressThrough = inProgress
    .map((p) => p.readingDate)
    .sort()
    .at(-1);
  const inProgressNames = Array.from(new Set(inProgress.map((p) => p.utility))).sort();

  return (
    <section aria-label={`Natural gas rate history ${UNIT_LABEL[unit]}`}>
      <h3 className="font-display text-base font-bold">
        Gas rate history, priced {UNIT_LABEL[unit]}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Total volumetric charge (distribution plus gas cost) {UNIT_LABEL[unit]}, as published in the
        MPSC residential rate comparison. {UNIT_NOTE[unit]} The monthly customer charge is listed in
        the table above, not in this chart.
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 rounded-lg border bg-surface p-4 text-sm text-muted-foreground">
          No utility is selected. Choose at least one below to see its history.
        </p>
      ) : (
        <div
          className="mt-3 h-72 w-full rounded-lg border bg-card p-2"
          role="img"
          aria-label={`Line chart of monthly total gas charge ${UNIT_LABEL[unit]} for ${selected.join(", ")} from ${formatTableDate(first)} to ${formatTableDate(last)}`}
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
                width={52}
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              />
              <Tooltip content={renderTooltip as never} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {selected.map((u) => (
                <Line
                  key={u}
                  type="monotone"
                  dataKey={u}
                  stroke={COLORS[u] ?? "#4b5563"}
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
        <legend className="text-sm font-semibold">Utilities shown on this chart</legend>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {utilities.map((u) => {
            const id = `gas-util-${unit}-${u.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
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
      {inProgressThrough && (
        <p className="mt-2 text-xs text-muted-foreground">
          Data collection in progress for {inProgressNames.join(", ")}: figures through{" "}
          {formatTableDate(inProgressThrough)} are stored values that have not yet been checked
          against a published MPSC table.
        </p>
      )}
    </section>
  );
}

/** Natural gas tab: latest stored rates and monthly history, scoped to the selected county's utilities. */
export function GasRateHistory({ county }: { county: string | null }) {
  const opts = { staleTime: 60 * 60 * 1000, retry: 1 } as const;
  const query = useQuery({
    queryKey: ["gas-rates"],
    queryFn: ({ signal }) => fetchGasRates(signal),
    ...opts,
  });
  // County service areas are optional: if they cannot be read, every utility is shown.
  const territoryQuery = useQuery({
    queryKey: ["gas-service-territory"],
    queryFn: ({ signal }) => fetchGasTerritory(signal),
    ...opts,
  });

  const points = useMemo(() => query.data ?? [], [query.data]);
  const all = useMemo(() => gasUtilityList(points), [points]);
  const countyUtilities = useMemo(
    () => (territoryQuery.data ? gasUtilitiesForCounty(territoryQuery.data, county) : null),
    [territoryQuery.data, county],
  );
  const utilities = useMemo(
    () => (countyUtilities ? all.filter((u) => countyUtilities.includes(u)) : all),
    [all, countyUtilities],
  );
  const latest = useMemo(() => latestGasByUtility(points), [points]);
  const groups = useMemo(() => gasUnitGroups(points, utilities), [points, utilities]);

  if (query.isPending) {
    return (
      <p role="status" className="rounded-lg border bg-surface p-6 text-sm text-muted-foreground">
        Loading the natural gas rate history…
      </p>
    );
  }
  if (query.isError || query.data === null || points.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-surface p-6">
        <p className="font-display text-base font-bold text-primary">Data not yet loaded</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The natural gas rate history is not available right now. No figure is shown until it can
          be read with its source.
        </p>
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

  const newest = points.at(-1)?.readingDate ?? "";
  const sourceUrl = [...points].reverse().find((p) => p.sourceUrl)?.sourceUrl ?? null;

  return (
    <div className="space-y-4">
      <p className="rounded-lg border bg-surface p-3 text-sm text-muted-foreground">
        {county && countyUtilities
          ? `Showing the MPSC-regulated natural gas utilities with service in ${county} County. A utility may serve only some communities in the county. Check your bill for your utility's name.`
          : county
            ? `No MPSC-regulated gas utility is on record for ${county} County, so every utility is shown. Your gas may come from a utility the MPSC rate comparison does not cover. Check your bill for your utility's name.`
            : "Every MPSC-regulated natural gas utility is shown. Each serves only part of Michigan, so select a county on the map or check your bill for your utility's name."}
      </p>

      <section
        aria-label="Latest rates for each gas utility"
        className="rounded-lg border bg-card p-4"
      >
        <h3 className="font-display text-base font-bold">Latest published rates</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Residential, as printed in the MPSC table dated {formatTableDate(newest)}. Utilities price
          gas by the Ccf or by the therm, so figures in different units are not comparable.
        </p>
        {(["Ccf", "Therm"] as const).map((unit) =>
          groups[unit].length === 0 ? null : (
            <div key={unit} className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Priced {UNIT_LABEL[unit]}
                </caption>
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="py-1 pr-3 font-semibold">
                      Utility
                    </th>
                    <th scope="col" className="py-1 pr-3 font-semibold">
                      Monthly charge
                    </th>
                    <th scope="col" className="py-1 pr-3 font-semibold">
                      Distribution
                    </th>
                    <th scope="col" className="py-1 pr-3 font-semibold">
                      Gas cost
                    </th>
                    <th scope="col" className="py-1 pr-3 font-semibold">
                      Total
                    </th>
                    <th scope="col" className="py-1 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groups[unit].map((u) => {
                    const p = latest.get(u);
                    if (!p) return null;
                    return (
                      <tr key={u} className="border-b last:border-0">
                        <th scope="row" className="py-1 pr-3 font-medium">
                          <span
                            aria-hidden
                            className="mr-2 inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: COLORS[u] ?? "#4b5563" }}
                          />
                          {u}
                        </th>
                        <td className="py-1 pr-3">{usd(p.customerCharge, 2)}</td>
                        <td className="py-1 pr-3">{usd(p.distribution, 5)}</td>
                        <td className="py-1 pr-3">{usd(p.gasCost, 5)}</td>
                        <td className="py-1 pr-3 font-semibold text-primary">
                          {p.sourceUrl ? usd(p.total, 5) : "Source pending"}
                        </td>
                        <td className="py-1">{statusLabel(p.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ),
        )}
        <SourceLine
          source={
            sourceUrl
              ? {
                  label: `${GAS_SOURCE_LABEL} (newest table dated ${formatTableDate(newest)})`,
                  url: sourceUrl,
                }
              : null
          }
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Change over time is not calculated here. Only values published by the MPSC are shown.
        </p>
      </section>

      {(["Ccf", "Therm"] as const).map((unit) =>
        groups[unit].length === 0 ? null : (
          <GasChart key={unit} unit={unit} utilities={groups[unit]} points={points} />
        ),
      )}
      <p className="text-xs text-muted-foreground">
        Data is refreshed periodically, not in real time. Each month matches the date printed on the
        MPSC table. Editions before January 2023 are not loaded yet.
      </p>
    </div>
  );
}
