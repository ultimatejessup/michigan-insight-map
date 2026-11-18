import { useQuery } from "@tanstack/react-query";
import {
  fetchElectricRates,
  fetchServiceTerritory,
  formatTableDate,
  latestByUtility,
  statusLabel,
  utilitiesForCounty,
} from "@/lib/rates/electric-rates";
import {
  fetchGasRates,
  fetchGasTerritory,
  gasUtilitiesForCounty,
  latestGasByUtility,
  type GasRatePoint,
} from "@/lib/rates/gas-rates";

const DAY = 24 * 60 * 60 * 1000;

const usd = (n: number, digits: number) => `$${n.toFixed(digits)}`;

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded text-primary underline underline-offset-2 hover:text-accent-strong"
    >
      {children}
    </a>
  );
}

function GasRow({ point }: { point: GasRatePoint }) {
  const unit = point.unit === "Ccf" ? "per Ccf" : "per therm";
  return (
    <li className="py-2">
      <p className="font-medium">{point.utility}</p>
      <p className="text-xs text-muted-foreground">
        MPSC table dated {formatTableDate(point.readingDate)} · {statusLabel(point.status)}
        {point.sourceUrl && (
          <>
            {" · "}
            <ExtLink href={point.sourceUrl}>Source</ExtLink>
          </>
        )}
      </p>
      <dl className="mt-1 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        {point.customerCharge !== null && (
          <div>
            <dt className="text-xs text-muted-foreground">Monthly customer charge</dt>
            <dd className="font-semibold">{usd(point.customerCharge, 2)}</dd>
          </div>
        )}
        {point.distribution !== null && (
          <div>
            <dt className="text-xs text-muted-foreground">Distribution {unit}</dt>
            <dd className="font-semibold">{usd(point.distribution, 5)}</dd>
          </div>
        )}
        {point.gasCost !== null && (
          <div>
            <dt className="text-xs text-muted-foreground">Gas cost {unit}</dt>
            <dd className="font-semibold">{usd(point.gasCost, 5)}</dd>
          </div>
        )}
        {point.total !== null && (
          <div>
            <dt className="text-xs text-muted-foreground">Total {unit}</dt>
            <dd className="font-semibold text-primary">{usd(point.total, 5)}</dd>
          </div>
        )}
      </dl>
    </li>
  );
}

/** Electric and natural gas utilities on record for the county, with their newest stored rates. */
export function ProvidersSection({ county }: { county: string | null }) {
  const opts = { staleTime: DAY, retry: 1 } as const;
  const elecTerritory = useQuery({
    queryKey: ["electric-service-territory"],
    queryFn: ({ signal }) => fetchServiceTerritory(signal),
    ...opts,
  });
  const elecRates = useQuery({
    queryKey: ["electric-rate-history"],
    queryFn: ({ signal }) => fetchElectricRates(signal),
    ...opts,
  });
  const gasTerritory = useQuery({
    queryKey: ["gas-service-territory"],
    queryFn: ({ signal }) => fetchGasTerritory(signal),
    ...opts,
  });
  const gasRates = useQuery({
    queryKey: ["gas-rates"],
    queryFn: ({ signal }) => fetchGasRates(signal),
    ...opts,
  });

  if (!county) return null;
  const loading =
    elecTerritory.isPending || elecRates.isPending || gasTerritory.isPending || gasRates.isPending;
  if (loading) {
    return (
      <p role="status" className="mt-4 text-sm text-muted-foreground">
        Loading energy providers…
      </p>
    );
  }

  const electricNames = elecTerritory.data ? utilitiesForCounty(elecTerritory.data, county) : null;
  const electricLatest = elecRates.data ? latestByUtility(elecRates.data) : new Map();
  const gasNames = gasTerritory.data ? gasUtilitiesForCounty(gasTerritory.data, county) : null;
  const gasLatest = gasRates.data ? latestGasByUtility(gasRates.data) : new Map();

  return (
    <section
      aria-label={`Energy providers in ${county} County`}
      className="mt-4 rounded-lg border bg-surface p-4"
    >
      <h3 className="font-display text-base font-bold">
        Energy providers and rates in {county} County
      </h3>

      <h4 className="mt-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Electric
      </h4>
      {electricNames ? (
        <ul className="divide-y text-sm">
          {electricNames.map((name) => {
            const p = electricLatest.get(name);
            return (
              <li key={name} className="py-2">
                <p className="font-medium">{name}</p>
                {p ? (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-display text-base font-bold text-primary">
                      {p.value.toFixed(2)} ¢/kWh
                    </span>{" "}
                    residential, 1,000 kWh a month · MPSC table dated{" "}
                    {formatTableDate(p.readingDate)} · {statusLabel(p.status)}
                    {p.sourceUrl && (
                      <>
                        {" · "}
                        <ExtLink href={p.sourceUrl}>Source</ExtLink>
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">No stored rate for this utility.</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No MPSC-regulated electric utility is on record for {county} County. Electricity may come
          from a cooperative or municipal utility, which the MPSC rate table does not cover.
        </p>
      )}

      <h4 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Natural gas
      </h4>
      {gasNames ? (
        <ul className="divide-y">
          {gasNames.map((name) => {
            const p = gasLatest.get(name);
            return p ? (
              <GasRow key={name} point={p} />
            ) : (
              <li key={name} className="py-2 text-sm">
                <p className="font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">No stored rate for this utility.</p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No MPSC-regulated natural gas utility is on record for {county} County.
        </p>
      )}
      {gasNames && (
        <p className="mt-2 text-xs text-muted-foreground">
          Gas rates are shown as the MPSC prints them. Ccf (100 cubic feet) and therm are different
          units, so do not compare a Ccf figure with a therm figure.
        </p>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        A utility may serve only some communities in the county, and cooperative or municipal
        utilities are not in the MPSC tables. Check your bill for your utility&apos;s name.
      </p>
    </section>
  );
}
