import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/origins")({
  head: () =>
    pageHead(
      "/origins",
      "Origins — Michigan Essentials Watch",
      "How the Liberation Caucus built Michigan Essentials Watch: a utility rate tracker with transparent sources and an optional, privacy-first bill explainer.",
    ),
  component: OriginsPage,
});

function OriginsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="font-semibold text-accent-strong">Michigan Essentials Watch</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold text-primary">Origins</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        A public advocacy tool by the Liberation Caucus, built to help Michigan residents understand
        essential utility costs and make their experiences heard.
      </p>
      <div className="mt-8 space-y-8 border-t pt-8 text-base leading-relaxed">
        <section>
          <h2 className="font-display text-2xl font-bold">The utility rate tracker</h2>
          <p className="mt-3">
            The tracker shows what Michigan households pay for electric, natural gas, water and
            broadband, county by county, and how utilities and states compare. It was built around
            residents’ questions: What are we paying? Where does the information come from? Who
            makes decisions about utility service? Those questions also shaped the utility story
            page and the candidate pledge.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-bold">About the Liberation Caucus</h2>
          <p className="mt-3">
            The Liberation Caucus is a non-partisan, non-profit organization to advance the
            political, community and economic interests of Black people and people of the African
            diaspora through the dismantling of oppressive systems and structures that promote
            economic, racial, and gender justice, while building the capacity to dismantle sexism,
            ableism, racism, patriarchy and militarism. Membership is free at{" "}
            <a
              href="https://liberationcaucus.com"
              className="font-semibold text-primary underline underline-offset-4"
            >
              liberationcaucus.com
            </a>
            .
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-bold">How it was built</h2>
          <p className="mt-3">
            The Liberation Caucus directed the site’s purpose, content and design. The website was
            developed with AI-assisted tools, through iterative instructions and review. AI
            assistance in building the website is separate from the optional service that explains a
            bill.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-bold">Sources before numbers</h2>
          <p className="mt-3">
            The tracker is designed to show sourced utility information, not invented figures. Data
            that has not been loaded is labeled clearly. The current tracker still has data gaps; a
            blank or “Data coming soon” panel is not a claim about a county’s utility costs.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-bold">Bill explanations are optional</h2>
          <p className="mt-3">
            Bill Check reads the bill you choose on your own device and hides personal details such
            as account numbers and addresses. You review and can edit the text, and only the text
            you send goes to an AI service for a plain-language explanation. The site does not save
            or publish it. Automatic hiding is not perfect, and AI can make mistakes, so check the
            text before you send it and the explanation against your bill. You never need to use
            Bill Check to use the tracker.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-bold">An advocacy tool, not an endorsement</h2>
          <p className="mt-3">
            The Liberation Caucus is a non-partisan, non-profit organization. Nothing on this site
            is an endorsement of any candidate or party.
          </p>
          <p className="mt-3">
            Questions or corrections? Contact{" "}
            <a
              href="mailto:power@miutilitieswatch.com"
              className="break-all font-semibold text-primary underline underline-offset-4"
            >
              power@miutilitieswatch.com
            </a>
            .
          </p>
        </section>
      </div>
      <div className="mt-8">
        <Button asChild variant="accent">
          <Link to="/build">Build with us</Link>
        </Button>
      </div>
    </article>
  );
}
