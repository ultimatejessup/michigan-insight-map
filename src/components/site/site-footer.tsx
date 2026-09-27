export function SiteFooter() {
  return (
    <footer className="mt-16 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="font-display text-lg font-semibold">The Liberation Caucus</p>
        <p className="mt-3 max-w-3xl text-base leading-relaxed">
          The Liberation Caucus works to advance the political, community and economic interests of
          Black people and people of the African diaspora through the dismantling of oppressive
          systems.
        </p>
        <p className="mt-4 text-sm text-primary-foreground/80">
          The Liberation Caucus is a non-partisan, non-profit organization.
        </p>
        <p className="mt-8 border-t border-primary-foreground/20 pt-6 text-sm text-primary-foreground/80">
          Rate figures shown are illustrative placeholders pending a connected data source.
        </p>
      </div>
    </footer>
  );
}
