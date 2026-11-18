import { useState } from "react";
import { ElectricRateHistory, ElectricScopeNote } from "./electric-rate-history";
import { GasRateHistory } from "./gas-rate-history";
import { CountyProfileCard } from "./county-profile-card";
import { EnergyBurdenSection } from "./energy-burden-section";
import { ProvidersSection } from "./providers-section";
import { RaceReferenceSection } from "./race-reference-section";
import { RateActionsSection } from "./rate-actions-section";
import { BroadbandCard, LeadLinesCard, WaterCard } from "./snapshot-cards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Four tabs hold the utility data for the selected county: Electric, Natural Gas, Water (lead
 * service line counts and the few water/sewer rates collected) and Broadband (fixed availability by
 * place). Rate actions and energy burden sit below the tabs so the tab area stays uncrowded.
 */
const TABS = [
  { key: "electric", label: "Electric" },
  { key: "gas", label: "Natural Gas" },
  { key: "water", label: "Water" },
  { key: "broadband", label: "Broadband" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function DetailsPanel({ county }: { county: string | null }) {
  const [tab, setTab] = useState<TabKey>("electric");
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

      <ProvidersSection county={county} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mt-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-surface p-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-sm font-semibold">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="electric" className="mt-4 space-y-4">
          <ElectricRateHistory county={county} />
        </TabsContent>
        <TabsContent value="gas" className="mt-4 space-y-4">
          <GasRateHistory county={county} />
        </TabsContent>
        <TabsContent value="water" className="mt-4 space-y-4">
          <LeadLinesCard county={county} />
          <WaterCard county={county} />
        </TabsContent>
        <TabsContent value="broadband" className="mt-4 space-y-4">
          <BroadbandCard county={county} />
        </TabsContent>
      </Tabs>

      <div className="mt-6 space-y-6 border-t pt-6">
        <RateActionsSection county={county} />
        <EnergyBurdenSection county={county} place={place} />
        <RaceReferenceSection />
      </div>
    </div>
  );
}
