import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { counties, mapMetrics, michiganMap, type MapMetricKey } from "@/data/utility-data";
import { countyKey, fetchEnergyBurden } from "@/lib/census/energy-burden";
import { SourceLine } from "./source-line";
import { Label } from "@/components/ui/label";

type Props = {
  /** null = statewide view (no county selected) */
  selected: string | null;
  onSelect: (county: string | null) => void;
  metric: MapMetricKey;
  onMetricChange: (metric: MapMetricKey) => void;
};

export function MichiganMap({ selected, onSelect, metric, onMetricChange }: Props) {
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
  const active = mapMetrics.find((m) => m.key === metric)!;

  // County energy burden (county-wide figure, DOE LEAD Tool) read from the stored dataset.
  const burdenQuery = useQuery({
    queryKey: ["energy-burden"],
    queryFn: ({ signal }) => fetchEnergyBurden(signal),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
  const burden = useMemo(() => {
    const out: Record<string, number> = {};
    let sourceUrl: string | null = null;
    if (burdenQuery.data) {
      for (const c of counties) {
        const entry = burdenQuery.data.get(countyKey(c.name));
        const v = entry?.all?.burdenPct;
        if (typeof v === "number") {
          out[c.fips] = v;
          sourceUrl = sourceUrl ?? entry?.sourceUrl ?? null;
        }
      }
    }
    return { values: out, sourceUrl };
  }, [burdenQuery.data]);

  const isBurden = metric === "burden";
  const values = isBurden ? burden.values : active.values;
  const source =
    isBurden && burden.sourceUrl
      ? {
          label: "DOE Low-Income Energy Affordability Data (LEAD) Tool, 2022 update",
          url: burden.sourceUrl,
        }
      : active.source;
  const fmt = (v: number) => (isBurden ? v.toFixed(1) : String(v));
  const hasData = Object.keys(values).length > 0;
  const nums = Object.values(values);
  const min = hasData ? Math.min(...nums) : 0;
  const max = hasData ? Math.max(...nums) : 1;

  const fillFor = (fips: string, name: string) => {
    const v = values[fips];
    if (v === undefined) return "oklch(0.93 0.005 90)";
    const t = max === min ? 0.5 : (v - min) / (max - min);
    // Light to dark orange: a darker county spends a larger share of income on home energy.
    return `oklch(${0.95 - t * 0.45} ${0.03 + t * 0.15} 55)`;
  };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {mapMetrics.length > 1 ? (
          <div
            role="group"
            aria-label="Map metric"
            className="inline-flex rounded-md border border-input p-0.5"
          >
            {mapMetrics.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => onMetricChange(m.key)}
                aria-pressed={metric === m.key}
                className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                  metric === m.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="min-w-[12rem] flex-1">
          <Label htmlFor="county-select" className="sr-only">
            Choose a county
          </Label>
          <select
            id="county-select"
            value={selected ?? ""}
            onChange={(e) => onSelect(e.target.value === "" ? null : e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All of Michigan (statewide)</option>
            {counties.map((c) => (
              <option key={c.fips} value={c.name}>
                {c.name} County
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${michiganMap.width} ${michiganMap.height}`}
          role="img"
          aria-label="Map of Michigan counties. Use the county dropdown above for keyboard selection."
          className="h-[300px] w-full lg:h-[min(60vh,560px)]"
        >
          {counties.map((c) => (
            <path
              key={c.fips}
              d={c.d}
              fill={fillFor(c.fips, c.name)}
              stroke="var(--primary)"
              strokeWidth={0.6}
              className="cursor-pointer transition-[fill]"
              onClick={() => onSelect(c.name === selected ? null : c.name)}
              onMouseEnter={() => setHover({ name: c.name, x: c.cx, y: c.cy })}
              onMouseLeave={() => setHover(null)}
            >
              <title>
                {c.name} County —{" "}
                {values[c.fips] !== undefined
                  ? `${fmt(values[c.fips]!)} ${active.unit}`
                  : "no data yet"}
              </title>
            </path>
          ))}
          {selected !== null
            ? counties
                .filter((c) => c.name === selected)
                .map((c) => (
                  <path
                    key={`outline-${c.fips}`}
                    d={c.d}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth={3.5}
                    strokeLinejoin="round"
                    pointerEvents="none"
                  />
                ))
            : null}
        </svg>
        {hover ? (
          <div
            className="pointer-events-none absolute rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
            style={{
              left: `${(hover.x / michiganMap.width) * 100}%`,
              top: `${(hover.y / michiganMap.height) * 100}%`,
              transform: "translate(-50%, -140%)",
            }}
          >
            {hover.name} County ·{" "}
            {(() => {
              const v = values[counties.find((c) => c.name === hover.name)!.fips];
              return v === undefined ? "no data yet" : `${fmt(v)} ${active.unit}`;
            })()}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground" aria-live="polite">
          {selected === null
            ? "Showing all of Michigan. Select a county to see local figures."
            : `Showing ${selected} County.`}
        </p>
        {selected !== null ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-md border border-input px-3 py-1 font-semibold text-primary hover:bg-surface"
          >
            Reset to statewide
          </button>
        ) : null}
      </div>

      <div className="mt-3 border-t pt-3">
        <p className="text-sm font-semibold">{active.label} by county</p>
        {hasData ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{fmt(min)}</span>
            <div
              className="h-2 flex-1 rounded"
              style={{
                background: "linear-gradient(90deg, oklch(0.95 0.03 55), oklch(0.5 0.18 55))",
              }}
            />
            <span className="text-xs text-muted-foreground">
              {fmt(max)} {active.unit}
            </span>
          </div>
        ) : isBurden && burdenQuery.isPending ? (
          <p role="status" className="mt-1 text-sm text-muted-foreground">
            Loading county energy burden…
          </p>
        ) : isBurden ? (
          <p className="mt-1 text-sm text-muted-foreground">
            County energy burden is not available right now, so counties are shown unshaded
            {selected !== null ? ", and the selected county has a dark outline" : ""}.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Data coming soon. {active.comingSoonNote} Counties are shown unshaded
            {selected !== null ? ", and the selected county has a dark outline" : ""}.
          </p>
        )}
        {hasData && isBurden ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Each county is shaded by the share of household income that all households there spend
            on home energy: electricity, natural gas and other fuels such as propane, fuel oil or
            wood. It is not electric-only, and it leaves out gasoline and other transportation
            costs. Darker orange means a larger share of income. These are DOE LEAD Tool modeled
            estimates (2022 update), not what any one household pays.
          </p>
        ) : null}
        <SourceLine source={source} />
      </div>
    </div>
  );
}
