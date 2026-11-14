import { useQuery } from "@tanstack/react-query";
import { ACS_SOURCE, fetchCountyProfiles, profileForCounty } from "@/lib/census/county-profile";
import { SourceLine } from "./source-line";

const nf = new Intl.NumberFormat("en-US");
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Population and median household income for the selected county. Renders nothing until a county is chosen and data is available. */
export function CountyProfileCard({ county }: { county: string | null }) {
  const query = useQuery({
    queryKey: ["county-profiles"],
    queryFn: ({ signal }) => fetchCountyProfiles(signal),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
  if (!county || !query.data) return null;
  const p = profileForCounty(query.data, county);
  if (!p || (p.population === null && p.medianHouseholdIncome === null && p.blackSharePct === null))
    return null;

  return (
    <section
      aria-label={`About ${county} County`}
      className="mt-4 rounded-lg border bg-surface p-4"
    >
      <h3 className="font-display text-base font-bold">About {county} County</h3>
      <dl className="mt-2 grid gap-3 sm:grid-cols-3">
        {p.population !== null && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Population
            </dt>
            <dd className="font-display text-xl font-bold text-primary">
              {nf.format(p.population)}
            </dd>
          </div>
        )}
        {p.medianHouseholdIncome !== null && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Median household income
            </dt>
            <dd className="font-display text-xl font-bold text-primary">
              {usd.format(p.medianHouseholdIncome)}
            </dd>
          </div>
        )}
        {p.blackSharePct !== null && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Black residents
            </dt>
            <dd className="font-display text-xl font-bold text-primary">
              {p.blackSharePct.toFixed(1)}% of the population
            </dd>
          </div>
        )}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        Estimates, not exact counts. Data year {p.dataYear}.
      </p>
      <SourceLine source={ACS_SOURCE} />
    </section>
  );
}
