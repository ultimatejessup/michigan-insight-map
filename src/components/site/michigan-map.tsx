import { useState } from "react";
import { counties, mapMetrics, michiganMap, type MapMetricKey } from "@/data/utility-data";
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
  const values = active.values;
  const hasData = Object.keys(values).length > 0;
  const nums = Object.values(values);
  const min = hasData ? Math.min(...nums) : 0;
  const max = hasData ? Math.max(...nums) : 1;

  const fillFor = (fips: string, name: string) => {
    if (selected !== null && name === selected) return "var(--accent)";
    const v = values[fips];
    if (v === undefined) return "oklch(0.93 0.012 245)";
    const t = max === min ? 0.5 : (v - min) / (max - min);
    return `oklch(${0.9 - t * 0.5} ${0.03 + t * 0.09} 258)`;
  };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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
              stroke={c.name === selected ? "var(--accent-strong)" : "var(--primary)"}
              strokeWidth={c.name === selected ? 3 : 0.6}
              className="cursor-pointer transition-[fill]"
              onClick={() => onSelect(c.name === selected ? null : c.name)}
              onMouseEnter={() => setHover({ name: c.name, x: c.cx, y: c.cy })}
              onMouseLeave={() => setHover(null)}
            >
              <title>
                {c.name} County —{" "}
                {values[c.fips] !== undefined ? `${values[c.fips]} ${active.unit}` : "no data yet"}
              </title>
            </path>
          ))}
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
            {values[counties.find((c) => c.name === hover.name)!.fips] ?? "no data yet"}
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
            <span className="text-xs text-muted-foreground">{min}</span>
            <div
              className="h-2 flex-1 rounded"
              style={{
                background: "linear-gradient(90deg, oklch(0.9 0.03 258), oklch(0.4 0.12 258))",
              }}
            />
            <span className="text-xs text-muted-foreground">
              {max} {active.unit}
            </span>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Data coming soon. {active.comingSoonNote} Counties are shown unshaded
            {selected !== null ? ", and the selected county is outlined in orange" : ""}.
          </p>
        )}
        <SourceLine source={active.source} />
      </div>
    </div>
  );
}
