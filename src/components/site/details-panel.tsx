import { Link } from "@tanstack/react-router";
import { utilityDatasets, type UtilityDataset } from "@/data/utility-data";
import { SourceLine } from "./source-line";
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
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-bold text-primary">Coming soon</p>
      <SourceLine source={dataset.source} />
    </div>
  );
}

export function DetailsPanel({ county }: { county: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-card sm:p-6">
      <p className="text-base font-semibold text-foreground">
        In {county} County, the share of household income spent on energy is not loaded yet —
        the energy burden figure will appear here once the data source is connected.
      </p>

      <Tabs defaultValue="electric" className="mt-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-surface p-1">
          {utilityDatasets.map((d) => (
            <TabsTrigger key={d.key} value={d.key} className="text-sm font-semibold">
              {d.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {utilityDatasets.map((dataset) => (
          <TabsContent key={dataset.key} value={dataset.key} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Current rate" dataset={dataset} />
              <StatCard label="Change over 12 months" dataset={dataset} />
              <StatCard label="Change since 2018" dataset={dataset} />
            </div>

            <section aria-label={`${dataset.label} rate history`}>
              <h3 className="font-display text-base font-bold">
                {dataset.label} rate history
              </h3>
              <div className="mt-2">
                <ComingSoon dataset={dataset} />
              </div>
            </section>

            <section aria-label="Energy burden" className="rounded-lg border bg-surface p-4">
              <h3 className="font-display text-base font-bold">
                Energy burden in {county} County
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Data coming soon. The share of household income spent on energy, and how it
                compares with the Michigan average, will appear here once the DOE LEAD Tool
                data is connected.
              </p>
              <SourceLine source={null} />
            </section>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
