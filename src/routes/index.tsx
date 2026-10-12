import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MichiganMap } from "@/components/site/michigan-map";
import { DetailsPanel } from "@/components/site/details-panel";
import { Button } from "@/components/ui/button";
import type { MapMetricKey } from "@/data/utility-data";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "/",
      "Michigan Essentials Watch — Utility Rate Tracker",
      "See what Michigan households pay for electric, natural gas, water and broadband, county by county.",
    ),
  component: TrackerPage,
});

function TrackerPage() {
  const [county, setCounty] = useState("Wayne");
  const [metric, setMetric] = useState<MapMetricKey>("burden");

  return (
    <>
      <section className="section-tint border-b">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-7">
          <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">
            What are you paying, and who decides?
          </h1>
          <p className="mt-2 max-w-3xl text-base text-muted-foreground">
            Track what Michigan households pay for essential utilities, county by county. Then
            tell us your experience and ask candidates where they stand.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="accent">
              <Link to="/survey">Take the Survey</Link>
            </Button>
            <Button asChild variant="outlinePrimary">
              <Link to="/pledge">Take the Candidate Pledge</Link>
            </Button>
          </div>
        </div>
      </section>

      <section aria-label="Rate tracker" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[45fr_55fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <MichiganMap
              selected={county}
              onSelect={setCounty}
              metric={metric}
              onMetricChange={setMetric}
            />
          </div>
          <div className="lg:sticky lg:top-24">
            <DetailsPanel county={county} />
          </div>
        </div>
      </section>
    </>
  );
}
