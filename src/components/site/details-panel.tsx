import { Link } from "@tanstack/react-router";
import { utilityDatasets, type UtilityDataset } from "@/data/utility-data";
import { SourceLine } from "./source-line";
import { ElectricRateHistory, ElectricScopeNote } from "./electric-rate-history";
import { useState } from "react";
import { CountyProfileCard } from "./county-profile-card";
import { EnergyBurdenSection } from "./energy-burden-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function ComingSoon({ dataset }: { dataset: UtilityDataset }) {
  return (
    <div className="rounded-lg border border-dashed bg-surface p-6">
      <p className="font-display text-base font-bold text-primary">Data coming soon</p>
      <p className="mt-2 text-sm text-muted-foreground">{dataset.comingSoonNote}</p>
      <Link
        to="/survey"
        className="mt-4 inline-flex rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-strong hover:text-primary-foreground"
      >
        Tell us what you pay
      </Link>
      <SourceLine source={dataset.source} />
    </div>
  );
}

function StatCard({ label, dataset }: { label: string; dataset: UtilityDataset }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-primary">Coming soon</p>
      <SourceLine source={dataset.source} />
    </div>
  );
}

export function DetailsPanel({ county }: { county: string | null }) {
  const [tab, setTab] = useState<string>(utilityDatasets[0]?.key ?? "electric");
  const place = county === null ? "Michigan (statewide)" : `${county} County`;
  return (
    <div className="rounded-lg border bg-card p-4 shadow-card sm:p-6">
      <p className="text-base font-semibold text-foreground">
        {county === null
          ? "Showing all of Michigan. Select a county on the map to see local figures."
          : `Showing figures for ${county} County.`}
      </p>

      {tab === "electric" && <ElectricScopeNote county={county} />}

      <CountyProfileCard county={county} />

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-surface p-1">
          {utilityDatasets.map((d) => (
            <TabsTrigger key={d.key} value={d.key} className="text-sm font-semibold">
              {d.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {utilityDatasets.map((dataset) => (
          <TabsContent key={dataset.key} value={dataset.key} className="mt-4 space-y-4">
            {dataset.key === "electric" ? (
              <ElectricRateHistory county={county} />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard label="Current rate" dataset={dataset} />
                  <StatCard label="Change over 12 months" dataset={dataset} />
                  <StatCard label="Change since 2018" dataset={dataset} />
                </div>

                <section aria-label={`${dataset.label} rate history`}>
                  <h3 className="font-display text-base font-bold">{dataset.label} rate history</h3>
                  <div className="mt-2">
                    <ComingSoon dataset={dataset} />
                  </div>
                </section>
              </>
            )}

            <EnergyBurdenSection county={county} place={place} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
