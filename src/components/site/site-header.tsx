import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const router = useRouter();

  const goToStories = async () => {
    if (router.state.location.pathname !== "/") {
      await router.navigate({ to: "/" });
    }
    requestAnimationFrame(() => {
      document
        .getElementById("share-your-story")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b-4 border-primary bg-background">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="min-w-0 rounded-md">
          <span className="block truncate font-display text-lg font-bold leading-tight text-primary sm:text-xl">
            MI Essentials
          </span>
          <span className="block truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            A Liberation Caucus project
          </span>
        </Link>

        <nav aria-label="Main" className="flex shrink-0 items-center gap-1 sm:gap-3">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="hidden rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:text-accent-strong sm:block"
            activeProps={{
              className: "text-primary underline underline-offset-8 decoration-2",
            }}
          >
            Rate Tracker
          </Link>
          <Link
            to="/pledge"
            className="hidden rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:text-accent-strong sm:block"
            activeProps={{
              className: "text-primary underline underline-offset-8 decoration-2",
            }}
          >
            Candidate Pledge
          </Link>
          <Button variant="accent" size="sm" onClick={goToStories}>
            Share Your Story
          </Button>
        </nav>
      </div>
      <div className="border-t bg-surface sm:hidden">
        <div className="mx-auto flex max-w-6xl gap-4 px-4 py-2">
          <Link to="/" activeOptions={{ exact: true }} className="text-sm font-semibold">
            Rate Tracker
          </Link>
          <Link to="/pledge" className="text-sm font-semibold">
            Candidate Pledge
          </Link>
        </div>
      </div>
    </header>
  );
}
