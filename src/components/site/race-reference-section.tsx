import { useQuery } from "@tanstack/react-query";
import {
  UNLABELED_SCOPE,
  displayValue,
  fetchRaceReference,
  groupRaceReference,
} from "@/lib/census/race-reference";

/**
 * Published studies of energy burden by race. Shown once, collapsed, and kept apart from the
 * county figures: none of these numbers is about the selected county or Michigan as a whole.
 */
export function RaceReferenceSection() {
  const query = useQuery({
    queryKey: ["race-reference"],
    queryFn: ({ signal }) => fetchRaceReference(signal),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
  const groups = query.data ? groupRaceReference(query.data) : [];
  if (query.isPending || groups.length === 0) return null;

  return (
    <details className="mt-4 rounded-lg border bg-surface p-4">
      <summary className="cursor-pointer font-display text-base font-bold">
        What published studies say about energy burden by race
      </summary>
      <p className="mt-2 text-sm text-muted-foreground">
        These figures come from national studies, a 48-city study and the Detroit metro area. They
        are not figures for Michigan as a whole or for any county, and no public source tracks
        energy burden by race at the county level. The studies use different years and definitions,
        so compare rows only within the same group.
      </p>
      {groups.map((group) => (
        <div key={group.scope ?? "unlabeled"} className="mt-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {group.scope ?? UNLABELED_SCOPE}
          </h4>
          <ul className="mt-1 divide-y text-sm">
            {group.rows.map((row) => {
              const value = displayValue(row);
              if (!value) return null;
              return (
                <li key={row.id} className="py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="font-medium">{row.raceEthnicity}</span>
                    <span className="font-display font-bold text-primary">{value.text}</span>
                  </div>
                  {row.measure && <p className="text-xs text-muted-foreground">{row.measure}</p>}
                  <p className="text-xs text-muted-foreground">
                    {row.dataYear}.{" "}
                    {row.sourceUrl && (
                      <a
                        href={row.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded text-primary underline underline-offset-2 hover:text-accent-strong"
                      >
                        {row.source}
                      </a>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </details>
  );
}
