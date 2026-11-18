import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchDataSources, STATIC_SOURCES, type HostGroup } from "@/lib/sources/sources";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/sources")({
  head: () =>
    pageHead(
      "/sources",
      "Sources — Michigan Utility Watch",
      "The agencies, datasets and documents Michigan Utility Watch uses for utility rates, rate actions, energy burden, population and broadband figures.",
    ),
  component: SourcesPage,
});

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="break-words rounded text-primary underline underline-offset-2 hover:text-accent-strong"
    >
      {children}
    </a>
  );
}

function Groups({ groups, empty }: { groups: HostGroup[]; empty: string }) {
  if (groups.length === 0) return <p className="mt-3 text-muted-foreground">{empty}</p>;
  return (
    <div className="mt-3 space-y-4">
      {groups.map((g) => (
        <div key={g.host}>
          <h3 className="font-semibold">{g.host}</h3>
          <ul className="mt-1 list-disc space-y-1 pl-6">
            {g.links.map((l) => (
              <li key={l.url}>
                <Link href={l.url}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SourcesPage() {
  const q = useQuery({
    queryKey: ["data-sources"],
    queryFn: ({ signal }) => fetchDataSources(signal),
    staleTime: 24 * 60 * 60 * 1000,
  });
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="font-semibold text-accent-strong">Michigan Utility Watch</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold text-primary">Sources</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        Where the figures on this site come from. Each figure on the tracker is shown as stored from
        its source, with a link where one exists. Nothing is averaged or estimated by this site.
      </p>
      <div className="mt-8 space-y-8 border-t pt-8 text-base leading-relaxed">
        {STATIC_SOURCES.map((s) => (
          <section key={s.topic}>
            <h2 className="font-display text-2xl font-bold">{s.topic}</h2>
            <ul className="mt-3 space-y-3">
              {s.items.map((i) => (
                <li key={i.url}>
                  <Link href={i.url}>{i.name}</Link>
                  <p className="text-sm text-muted-foreground">{i.note}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section>
          <h2 className="font-display text-2xl font-bold">Rate actions</h2>
          <p className="mt-3">
            Rate cases and other actions are listed by utility. Some links go to the Michigan Public
            Service Commission or other state records; others are news reports or utility press
            releases. An action without a source link is shown by title only, with no figures.
          </p>
          {q.isLoading ? (
            <p className="mt-3 text-muted-foreground">Loading…</p>
          ) : (
            <Groups
              groups={q.data?.rateActions ?? []}
              empty="The list is not available right now."
            />
          )}
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold">Energy burden by race studies</h2>
          <p className="mt-3">
            Published studies shown as a reference on the Energy Burden tab. They cover the nation,
            48 cities or the Detroit area, not Michigan counties.
          </p>
          {q.isLoading ? (
            <p className="mt-3 text-muted-foreground">Loading…</p>
          ) : (
            <Groups
              groups={q.data?.raceStudies ?? []}
              empty="The list is not available right now."
            />
          )}
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold">Water and sewer rates</h2>
          <p className="mt-3">
            Local water systems set their own rates and only a few are collected so far. These are
            the documents behind the systems that are loaded.
          </p>
          {q.isLoading ? (
            <p className="mt-3 text-muted-foreground">Loading…</p>
          ) : (
            <Groups groups={q.data?.water ?? []} empty="No water sources are listed yet." />
          )}
        </section>
      </div>
    </article>
  );
}
