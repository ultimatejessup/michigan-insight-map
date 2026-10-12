import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="font-display text-lg font-semibold">Michigan Essentials Watch</p>
        <div className="mt-6 grid gap-6 md:grid-cols-[2fr_1fr]">
          <nav aria-label="Footer" className="flex flex-wrap content-start items-start gap-x-6 gap-y-3 text-base font-semibold">
            <Link to="/" className="underline underline-offset-4 hover:text-accent">Tracker</Link>
            <Link to="/survey" className="underline underline-offset-4 hover:text-accent">Survey</Link>
            <Link to="/pledge" className="underline underline-offset-4 hover:text-accent">Pledge</Link>
            <Link to="/bill-check" className="underline underline-offset-4 hover:text-accent">Bill Check</Link>
            <Link to="/build" className="underline underline-offset-4 hover:text-accent">Build</Link>
            <Link to="/origins" className="underline underline-offset-4 hover:text-accent">Origins</Link>
          </nav>
          <section aria-labelledby="footer-contact">
            <h2 id="footer-contact" className="font-display text-base font-semibold">Contact</h2>
            <a
              href="mailto:power@miutilitieswatch.com"
              className="mt-2 inline-block break-all text-base underline underline-offset-4 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              power@miutilitieswatch.com
            </a>
          </section>
        </div>
        <div className="mt-8 border-t border-primary-foreground/25 pt-6">
          <Link to="/disclaimers" className="text-base underline underline-offset-4 hover:text-accent">Data privacy, terms of service & content rights</Link>
        <p className="mt-4 text-base leading-relaxed">
          The Liberation Caucus is a non-partisan, non-profit organization. Nothing on this site is
          an endorsement of any candidate or party.
        </p>
        </div>
      </div>
    </footer>
  );
}
