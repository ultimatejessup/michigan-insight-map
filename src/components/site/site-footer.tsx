export function SiteFooter() {
  return (
    <footer className="mt-16 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="font-display text-lg font-semibold">Michigan Essentials Watch</p>
        <div className="mt-6 grid gap-6 md:grid-cols-[2fr_2fr_1fr]">
          <section aria-labelledby="footer-privacy">
            <h2 id="footer-privacy" className="font-display text-base font-semibold">Data privacy</h2>
            <p className="mt-2 text-base leading-relaxed">
              Bill check is optional. Uploaded bills are sent to an AI service to create an
              explanation; they are not saved on this site or published. Cover your account
              number, name and address before uploading. You can use the tracker without
              uploading a bill.
            </p>
          </section>
          <section aria-labelledby="footer-rights">
            <h2 id="footer-rights" className="font-display text-base font-semibold">Content rights</h2>
            <p className="mt-2 text-base leading-relaxed">
              Original site content © Liberation Caucus. Third-party data and materials remain
              subject to their owners’ rights and terms. Upload only bills you own or have
              permission to share. Contact us about permission to reuse site content.
            </p>
          </section>
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
        <p className="mt-8 border-t border-primary-foreground/25 pt-6 text-base leading-relaxed">
          The Liberation Caucus is a non-partisan, non-profit organization. Nothing on this site is
          an endorsement of any candidate or party.
        </p>
      </div>
    </footer>
  );
}
