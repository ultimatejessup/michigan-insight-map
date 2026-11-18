import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatTableDate } from "@/lib/rates/electric-rates";
import { broadbandForCounty, fetchBroadband, FIXED_TECHNOLOGIES } from "@/lib/broadband/broadband";
import {
  DSMI_SOURCE_URL,
  fetchCounty,
  fetchSupplies,
  suppliesForCounty,
} from "@/lib/water/service-lines";
import { fetchWaterCounties, fetchWaterRates, waterForCounty } from "@/lib/water/water-rates";

const DAY = 24 * 60 * 60 * 1000;
const FCC_URL = "https://broadbandmap.fcc.gov/";

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

const usd = (n: number) => `$${n.toFixed(2)}`;

export function WaterCard({ county }: { county: string | null }) {
  const rates = useQuery({
    queryKey: ["water-rates"],
    queryFn: ({ signal }) => fetchWaterRates(signal),
    staleTime: DAY,
  });
  const links = useQuery({
    queryKey: ["water-counties"],
    queryFn: ({ signal }) => fetchWaterCounties(signal),
    staleTime: DAY,
  });
  return (
    <section aria-labelledby="water-snapshot" className="rounded-md border bg-surface p-4">
      <h3 id="water-snapshot" className="font-display text-base font-semibold">
        Water and sewer snapshot
      </h3>
      {county === null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Select a county to see stored water and sewer rates.
        </p>
      ) : rates.isLoading || links.isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
      ) : !rates.data || !links.data ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Water figures are not available right now.
        </p>
      ) : (
        <WaterBody rows={waterForCounty(rates.data, links.data, county)} county={county} />
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Water and sewer rates are set by local systems and only a few are collected so far. A county
        with no entry has not been collected yet; it does not mean there is no charge.
      </p>
    </section>
  );
}

function WaterBody({ rows, county }: { rows: ReturnType<typeof waterForCounty>; county: string }) {
  if (rows.length === 0)
    return (
      <p className="mt-2 text-sm">No water or sewer rates collected yet for {county} County.</p>
    );
  return (
    <ul className="mt-2 divide-y">
      {rows.map((r) => (
        <li key={r.id} className="py-2">
          <p className="font-medium">{r.provider}</p>
          <p className="text-xs text-muted-foreground">
            {r.serviceType ?? "Water/sewer"}
            {r.effectiveDate && <> · effective {formatTableDate(r.effectiveDate)}</>}
            {r.completeness && <> · {r.completeness}</>}
            {r.sourceUrl ? (
              <>
                {" · "}
                <ExtLink href={r.sourceUrl}>Source</ExtLink>
              </>
            ) : (
              " · No source link yet"
            )}
          </p>
          {r.sourceUrl && (
            <dl className="mt-1 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              {r.customerCharge !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground">Monthly customer charge</dt>
                  <dd className="font-semibold">{usd(r.customerCharge)}</dd>
                </div>
              )}
              {r.waterRate !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground">Water rate</dt>
                  <dd className="font-semibold">
                    {usd(r.waterRate)}
                    {r.waterUnit ? ` per ${r.waterUnit}` : " (unit not stored)"}
                  </dd>
                </div>
              )}
              {r.sewerRate !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground">Sewer rate</dt>
                  <dd className="font-semibold">
                    {usd(r.sewerRate)}
                    {r.sewerUnit ? ` per ${r.sewerUnit}` : " (unit not stored)"}
                  </dd>
                </div>
              )}
              {r.stormwaterCharge !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground">Monthly stormwater charge</dt>
                  <dd className="font-semibold">{usd(r.stormwaterCharge)}</dd>
                </div>
              )}
            </dl>
          )}
        </li>
      ))}
    </ul>
  );
}

export function BroadbandCard({ county }: { county: string | null }) {
  const q = useQuery({
    queryKey: ["broadband"],
    queryFn: ({ signal }) => fetchBroadband(signal),
    staleTime: DAY,
  });
  const data = q.data ? broadbandForCounty(q.data, county) : null;
  const [all, setAll] = useState(false);
  const LIMIT = 5;
  const places = data ? (all ? data.places : data.places.slice(0, LIMIT)) : [];
  return (
    <section aria-labelledby="broadband-snapshot" className="rounded-md border bg-surface p-4">
      <h3 id="broadband-snapshot" className="font-display text-base font-semibold">
        Fixed broadband snapshot
      </h3>
      {county === null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Select a county to see stored broadband availability.
        </p>
      ) : q.isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
      ) : !q.data ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Broadband figures are not available right now.
        </p>
      ) : !data ? (
        <p className="mt-2 text-sm">No places collected yet for {county} County.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Fixed broadband availability by place, percent as stored
            </caption>
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Place
                </th>
                {FIXED_TECHNOLOGIES.map((t) => (
                  <th key={t} scope="col" className="py-1 pr-3 font-medium">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {places.map((p) => (
                <tr key={p.place}>
                  <th scope="row" className="py-1 pr-3 font-medium">
                    {p.place}
                  </th>
                  {FIXED_TECHNOLOGIES.map((t) => (
                    <td key={t} className="py-1 pr-3">
                      {p.values[t] === undefined ? "—" : `${p.values[t]}%`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.places.length > LIMIT && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="mt-2 rounded-md border px-3 py-1 text-sm font-semibold"
            >
              {all ? "Show fewer places" : `Show all ${data.places.length} places`}
            </button>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Percent of locations with each service, as stored, listed by place. Places are not combined
        into one county figure. {data?.asOf && <>FCC data as of {formatTableDate(data.asOf)}. </>}
        <ExtLink href={FCC_URL}>FCC Broadband Data Collection</ExtLink>
      </p>
    </section>
  );
}

const num = (n: number | null) => (n === null ? "not reported" : n.toLocaleString("en-US"));

export function LeadLinesCard({ county }: { county: string | null }) {
  const supplies = useQuery({
    queryKey: ["dsmi-supplies"],
    queryFn: ({ signal }) => fetchSupplies(signal),
    staleTime: DAY,
  });
  const placed = useQuery({
    queryKey: ["dsmi-county"],
    queryFn: ({ signal }) => fetchCounty(signal),
    staleTime: DAY,
  });
  const rows =
    supplies.data && placed.data ? suppliesForCounty(supplies.data, placed.data, county) : [];
  return (
    <section
      aria-labelledby="lead-snapshot"
      className="rounded-md border bg-surface p-4 lg:col-span-2"
    >
      <h3 id="lead-snapshot" className="font-display text-base font-semibold">
        Lead service lines (water systems matched to this county)
      </h3>
      {county === null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Select a county to see water systems matched to it.
        </p>
      ) : supplies.isLoading || placed.isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
      ) : !supplies.data || !placed.data ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Service line counts are not available right now.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-sm">No water systems are matched to {county} County yet.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Service line counts by water system</caption>
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Water system
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Lead
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Galvanized, once connected to lead
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Lead status unknown
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Non-lead
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.pwsId}>
                  <th scope="row" className="py-1 pr-3 font-medium">
                    {r.name}
                  </th>
                  <td className="py-1 pr-3">{num(r.lead)}</td>
                  <td className="py-1 pr-3">{num(r.galvanized)}</td>
                  <td className="py-1 pr-3">{num(r.unknown)}</td>
                  <td className="py-1 pr-3">{num(r.nonLead)}</td>
                  <td className="py-1 pr-3">{num(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Counts as submitted by each water system to the Michigan Department of Environment, Great
        Lakes, and Energy (EGLE)
        {supplies.data?.[0]?.asOf ? `, updated ${supplies.data[0].asOf}` : ""}. “Not reported” means
        the cell was blank in the source. A system is listed here when its name matches a city or
        township in this county; it may serve other areas, and systems that don’t match are on the{" "}
        <a href="/water-service-lines" className="text-primary underline underline-offset-2">
          statewide list
        </a>
        . <ExtLink href={DSMI_SOURCE_URL}>EGLE inventory</ExtLink>
      </p>
    </section>
  );
}
