import { useQuery } from "@tanstack/react-query";
import { burdenForCounty, fetchEnergyBurden } from "@/lib/census/energy-burden";
import { SourceLine } from "./source-line";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const nf = new Intl.NumberFormat("en-US");

const BRACKET_LABEL: Record<string, string> = {
  "0-100%": "Below the poverty line",
  "100-150%": "100–150% of the poverty line",
  "150-200%": "150–200% of the poverty line",
  "200-400%": "200–400% of the poverty line",
  "400%+": "Above 400% of the poverty line",
};

export function EnergyBurdenSection({ county, place }: { county: string | null; place: string }) {
  const query = useQuery({
    queryKey: ["energy-burden"],
    queryFn: ({ signal }) => fetchEnergyBurden(signal),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
  const data = query.data ? burdenForCounty(query.data, county) : null;
  const source = data?.sourceUrl
    ? {
        label: "DOE Low-Income Energy Affordability Data (LEAD) Tool, 2022 update",
        url: data.sourceUrl,
      }
    : null;

  return (
    <section aria-label="Energy burden" className="rounded-lg border bg-surface p-4">
      <h3 className="font-display text-base font-bold">Energy burden in {place}</h3>
      {county === null ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Select a county on the map to see the share of household income spent on energy there. A
          statewide figure is not loaded.
        </p>
      ) : query.isPending ? (
        <p role="status" className="mt-1 text-sm text-muted-foreground">
          Loading energy burden…
        </p>
      ) : !data || data.all?.burdenPct == null ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            The energy burden figure for {county} County is not available right now. No figure is
            shown until it can be read with its source.
          </p>
          <SourceLine source={null} />
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Households in {county} County spend about{" "}
            <strong className="font-display text-xl text-primary">
              {data.all.burdenPct.toFixed(1)}%
            </strong>{" "}
            of their income on home energy: electricity, natural gas and other fuels such as propane
            or fuel oil.
            {data.all.avgEnergyCost !== null && data.all.avgIncome !== null
              ? ` That is an average of ${usd.format(data.all.avgEnergyCost)} a year on energy for an average household income of ${usd.format(data.all.avgIncome)}.`
              : ""}
          </p>
          {data.brackets.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Energy burden by household income level</caption>
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="py-1 pr-3 font-semibold">
                      Household income
                    </th>
                    <th scope="col" className="py-1 pr-3 font-semibold">
                      Share of income on energy
                    </th>
                    <th scope="col" className="py-1 font-semibold">
                      Households
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.brackets.map((b) => (
                    <tr key={b.bracket} className="border-b last:border-0">
                      <th scope="row" className="py-1 pr-3 font-medium">
                        {BRACKET_LABEL[b.bracket] ?? b.bracket}
                      </th>
                      <td className="py-1 pr-3 font-semibold text-primary">
                        {b.burdenPct === null ? "Not available" : `${b.burdenPct.toFixed(1)}%`}
                      </td>
                      <td className="py-1">
                        {b.households === null ? "Not available" : nf.format(b.households)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Modeled estimates for {data.dataYear}, not what any one household pays. Income levels
            are measured against the federal poverty line.
          </p>
          <SourceLine source={source} />
        </>
      )}
    </section>
  );
}
