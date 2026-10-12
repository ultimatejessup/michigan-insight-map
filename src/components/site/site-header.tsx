import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

const links = [
  { to: "/", label: "Tracker", exact: true },
  { to: "/survey", label: "Survey", exact: false },
  { to: "/pledge", label: "Pledge", exact: false },
  { to: "/bill-check", label: "Bill check", exact: false },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b-4 border-primary bg-background">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3 rounded-md">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-5 w-5 fill-accent text-accent" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-bold leading-tight sm:text-xl">
              <span className="text-foreground">Michigan</span>{" "}
              <span className="text-primary">Essentials Watch</span>
            </span>
            <span className="block truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              by Liberation Caucus
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex shrink-0 items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              className="rounded-md px-2 py-2 text-sm font-semibold text-foreground hover:text-accent-strong sm:px-3"
              activeProps={{
                className: "text-primary underline underline-offset-8 decoration-2 decoration-accent",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
