import type { Source } from "@/data/utility-data";

export function SourceLine({ source }: { source: Source }) {
  if (!source) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Source: none loaded yet — no figure is shown.
      </p>
    );
  }
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      Source:{" "}
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="rounded text-primary underline underline-offset-2 hover:text-accent-strong"
      >
        {source.label}
      </a>
    </p>
  );
}
