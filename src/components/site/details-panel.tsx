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
 * Tabs hold data that exists for the selected county or its utilities. Water holds the lead service
 * line counts and the few water/sewer rates collected. Broadband lists fixed availability by place.
 */
const TABS = [
  { key: "electric", label: "Electric" },
  { key: "gas", label: "Natural Gas" },
  { key: "water", label: "Water" },
  { key: "broadband", label: "Broadband" },
  { key: "actions", label: "Rate Actions" },
  { key: "burden", label: "Energy Burden" },
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
        <TabsContent value="actions" className="mt-4 space-y-4">
          <RateActionsSection county={county} />
        </TabsContent>
        <TabsContent value="burden" className="mt-4 space-y-4">
          <EnergyBurdenSection county={county} place={place} />
          <RaceReferenceSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
