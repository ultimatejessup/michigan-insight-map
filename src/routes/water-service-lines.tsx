import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  DSMI_SOURCE_URL,
  fetchSupplies,
  filterSupplies,
  suppliesToCsv,
} from "@/lib/water/service-lines";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/water-service-lines")({
  head: () =>
    pageHead(
      "/water-service-lines",
      "Lead service lines by water system — Michigan Essentials Watch",
      "Statewide list of Michigan public water systems with service line counts by material, from the EGLE Distribution System Materials Inventory. Search and download as CSV.",
    ),
  component: ServiceLinesPage,
});

const num = (n: number | null) => (n === null ? "not reported" : n.toLocaleString("en-US"));
const STEP = 100;

function ServiceLinesPage() {
  const q = useQuery({
    queryKey: ["dsmi-supplies"],
    queryFn: ({ signal }) => fetchSupplies(signal),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(STEP);
  const rows = useMemo(() => filterSupplies(q.data ?? [], query), [q.data, query]);

  function download() {
    const blob = new Blob([suppliesToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = query.trim() ? "michigan-service-lines-search.csv" : "michigan-service-lines.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="font-semibold text-accent-strong">Michigan Essentials Watch</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold text-primary">
        Lead service lines by water system
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
        Every Michigan public water system in the state inventory, with its service lines counted by
        material. Counts are as submitted by each system to the Michigan Department of Environment,
        Great Lakes, and Energy (EGLE){q.data?.[0]?.asOf ? `, updated ${q.data[0].asOf}` : ""}. A
        blank cell in the source shows as “not reported”; nothing is estimated or added up here.{" "}
        <a
          href={DSMI_SOURCE_URL}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          EGLE inventory page
        </a>
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block text-sm font-medium">
          Search by system name or ID
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(STEP);
            }}
            className="mt-1 block w-72 max-w-full rounded-md border bg-background px-3 py-2 text-base"
          />
        </label>
        <button
          type="button"
          onClick={download}
          disabled={rows.length === 0}
          className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
        >
          Download {query.trim() ? "these" : "all"} {rows.length.toLocaleString("en-US")} as CSV
        </button>
      </div>

      {q.isLoading ? (
        <p className="mt-6 text-muted-foreground">Loading…</p>
      ) : !q.data || q.data.length === 0 ? (
        <p className="mt-6">The list is not available right now.</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted-foreground" role="status">
            Showing {Math.min(shown, rows.length).toLocaleString("en-US")} of{" "}
            {rows.length.toLocaleString("en-US")} systems.
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Service line counts by public water system</caption>
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Water system
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    ID
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Lead
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Galvanized, once connected to lead
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Lead status unknown
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Non-lead
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.slice(0, shown).map((r) => (
                  <tr key={r.pwsId}>
                    <th scope="row" className="py-2 pr-3 font-medium">
                      {r.name}
                    </th>
                    <td className="py-2 pr-3">{r.pwsId}</td>
                    <td className="py-2 pr-3">{num(r.lead)}</td>
                    <td className="py-2 pr-3">{num(r.galvanized)}</td>
                    <td className="py-2 pr-3">{num(r.unknown)}</td>
                    <td className="py-2 pr-3">{num(r.nonLead)}</td>
                    <td className="py-2 pr-3">{num(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shown < rows.length && (
            <button
              type="button"
              onClick={() => setShown((n) => n + STEP)}
              className="mt-4 rounded-md border px-4 py-2 font-semibold"
            >
              Show more
            </button>
          )}
        </>
      )}
    </article>
  );
}
