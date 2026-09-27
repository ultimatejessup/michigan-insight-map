import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const router = useRouter();

  const goToStories = async () => {
    if (router.state.location.pathname !== "/") {
      await router.navigate({ to: "/" });
    }
    requestAnimationFrame(() => {
      const target = document.getElementById("share-your-story");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      target?.querySelector<HTMLElement>("h2")?.focus();
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b-4 border-primary bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="group rounded-md">
          <span className="block font-display text-lg font-bold leading-tight text-primary sm:text-xl">
            Michigan Utility Rate Tracker
          </span>
          <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            A Liberation Caucus project
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-3">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:text-accent-strong"
            activeProps={{ className: "text-primary underline underline-offset-8 decoration-2" }}
          >
            Rate Tracker
          </Link>
          <Link
            to="/pledge"
            className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:text-accent-strong"
            activeProps={{ className: "text-primary underline underline-offset-8 decoration-2" }}
          >
            Candidate Pledge
          </Link>
          <Button variant="accent" size="sm" onClick={goToStories}>
            Share Your Story
          </Button>
        </nav>
      </div>
    </header>
  );
}
