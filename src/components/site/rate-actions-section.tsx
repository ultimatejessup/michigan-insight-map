import { useQuery } from "@tanstack/react-query";
import {
  actionDate,
  actionNamesFor,
  actionsForUtilities,
  fetchRateActions,
  type RateAction,
} from "@/lib/rates/rate-actions";
import { fetchGasTerritory, gasUtilitiesForCounty } from "@/lib/rates/gas-rates";
import {
  fetchServiceTerritory,
  formatTableDate,
  utilitiesForCounty,
} from "@/lib/rates/electric-rates";

const DAY = 24 * 60 * 60 * 1000;
const usd = (n: number, digits = 2) => `$${n.toFixed(digits)}`;

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function ActionRow({ a }: { a: RateAction }) {
  const when = actionDate(a);
  const verb = a.decisionDate ? "Decided" : a.filingDate ? "Filed" : null;
  // No figure is shown without its source link.
  const figures = a.sourceUrl !== null;
  return (
    <li className="py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {a.actionType}
        {a.utility && ` · ${a.utility}`}
      </p>
      <p className="font-medium">{a.title}</p>
      <p className="text-xs text-muted-foreground">
        {verb && when ? `${verb} ${formatTableDate(when)}` : "Date not recorded"}
        {a.effectiveDate && ` · Effective ${formatTableDate(a.effectiveDate)}`}
        {a.caseNumber && ` · Case ${a.caseNumber}`}
      </p>
      {figures ? (
        <dl className="mt-1 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          {a.requestedMillions !== null && (
            <div>
              <dt className="text-xs text-muted-foreground">Requested</dt>
              <dd className="font-semibold">{usd(a.requestedMillions, 1)}M</dd>
            </div>
          )}
          {a.approvedMillions !== null && (
            <div>
              <dt className="text-xs text-muted-foreground">Approved</dt>
              <dd className="font-semibold text-primary">{usd(a.approvedMillions, 1)}M</dd>
            </div>
          )}
          {a.monthlyImpact !== null && (
            <div>
              <dt className="text-xs text-muted-foreground">Typical residential bill</dt>
              <dd className="font-semibold">{usd(a.monthlyImpact)} a month</dd>
            </div>
          )}
          {a.pctIncrease !== null && (
            <div>
              <dt className="text-xs text-muted-foreground">Residential increase</dt>
              <dd className="font-semibold">{a.pctIncrease}%</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">Source pending: no figures shown.</p>
      )}
      {a.sourceUrl && (
        <p className="mt-1 text-xs">
          <a
            href={a.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded text-primary underline underline-offset-2 hover:text-accent-strong"
          >
            Source: {host(a.sourceUrl)}
          </a>
        </p>
      )}
    </li>
  );
}

/** Rate cases and related MPSC actions for the utilities serving the selected county. */
export function RateActionsSection({ county }: { county: string | null }) {
  const opts = { staleTime: DAY, retry: 1 } as const;
  const actionsQuery = useQuery({
    queryKey: ["rate-actions"],
    queryFn: ({ signal }) => fetchRateActions(signal),
    ...opts,
  });
  const elecTerritory = useQuery({
    queryKey: ["electric-service-territory"],
    queryFn: ({ signal }) => fetchServiceTerritory(signal),
    ...opts,
  });
  const gasTerritory = useQuery({
    queryKey: ["gas-service-territory"],
    queryFn: ({ signal }) => fetchGasTerritory(signal),
    ...opts,
  });

  if (actionsQuery.isPending) {
    return (
      <p role="status" className="rounded-lg border bg-surface p-6 text-sm text-muted-foreground">
        Loading rate actions…
      </p>
    );
  }
  if (actionsQuery.isError || !actionsQuery.data || actionsQuery.data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-surface p-6 text-sm text-muted-foreground">
        Rate actions are not available right now. Nothing is shown until they can be read with their
        sources.
      </p>
    );
  }

  const electric = elecTerritory.data ? utilitiesForCounty(elecTerritory.data, county) : null;
  const gas = gasTerritory.data ? gasUtilitiesForCounty(gasTerritory.data, county) : null;
  const names = county && (electric || gas) ? actionNamesFor(electric, gas) : null;
  const { utility, statewide } = actionsForUtilities(actionsQuery.data, names);

  return (
    <div className="space-y-4">
      <p className="rounded-lg border bg-surface p-3 text-sm text-muted-foreground">
        {county && names
          ? `Rate cases and decisions for the MPSC-regulated utilities on record for ${county} County, then statewide actions. Rate cases are filed by utility, not by county, so an action may not change every bill in the county.`
          : county
            ? `No MPSC-regulated utility is on record for ${county} County, so every action is shown.`
            : "Every recorded MPSC action is shown. Select a county on the map to see the utilities that serve it."}
      </p>

      <section aria-label="Rate cases and decisions" className="rounded-lg border bg-card p-4">
        <h3 className="font-display text-base font-bold">Utility rate cases and decisions</h3>
        {utility.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No rate action is recorded for these utilities.
          </p>
        ) : (
          <ul className="mt-1 divide-y">
            {utility.map((a) => (
              <ActionRow key={a.id} a={a} />
            ))}
          </ul>
        )}
      </section>

      {statewide.length > 0 && (
        <section aria-label="Statewide actions" className="rounded-lg border bg-card p-4">
          <h3 className="font-display text-base font-bold">Statewide actions</h3>
          <ul className="mt-1 divide-y">
            {statewide.map((a) => (
              <ActionRow key={a.id} a={a} />
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Figures are as recorded from the linked source, which is the MPSC or the outlet that
        reported the decision. Data is refreshed periodically, not in real time.
      </p>
    </div>
  );
}
