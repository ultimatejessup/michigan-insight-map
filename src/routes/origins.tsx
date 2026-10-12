import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/origins")({
  head: () => pageHead("/origins", "Origins — Michigan Essentials Watch", "How Liberation Caucus built Michigan Essentials Watch as a public utility advocacy tool, with transparent sources and optional AI bill explanations."),
  component: OriginsPage,
});

function OriginsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="font-semibold text-accent-strong">Michigan Essentials Watch</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold text-primary">Origins</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">A public advocacy tool by Liberation Caucus, built to help Michigan residents understand essential utility costs and make their experiences heard.</p>
      <div className="mt-8 space-y-8 border-t pt-8 text-base leading-relaxed">
        <section><h2 className="font-display text-2xl font-bold">Built around residents’ questions</h2><p className="mt-3">What are we paying? Where does the information come from? Who makes decisions about utility service? Those questions shaped the county tracker, the utility story page and the candidate pledge.</p></section>
        <section><h2 className="font-display text-2xl font-bold">How it was built</h2><p className="mt-3">Liberation Caucus directed the site’s purpose, content and design. The website was developed with Lovable’s AI-assisted app-building tools, through iterative instructions and review. AI assistance in building the website is separate from the optional service that explains an uploaded bill.</p></section>
        <section><h2 className="font-display text-2xl font-bold">Sources before numbers</h2><p className="mt-3">The tracker is designed to show sourced utility information, not invented figures. Data that has not been loaded is labeled clearly. The current tracker still has data gaps; a blank or “Data coming soon” panel is not a claim about a county’s utility costs.</p></section>
        <section><h2 className="font-display text-2xl font-bold">Bill explanations are optional</h2><p className="mt-3">Bill Check sends a document you choose to upload to an AI service for a plain-language explanation. The site does not save or publish uploaded bills. Cover personal details before uploading, and check the explanation against your bill: AI can make mistakes. You never need to upload a bill to use the tracker.</p></section>
        <section><h2 className="font-display text-2xl font-bold">An advocacy tool, not an endorsement</h2><p className="mt-3">The Liberation Caucus is a non-partisan, non-profit organization. Nothing on this site is an endorsement of any candidate or party.</p><p className="mt-3">Questions or corrections? Contact <a href="mailto:power@miutilitieswatch.com" className="break-all font-semibold text-primary underline underline-offset-4">power@miutilitieswatch.com</a>.</p></section>
      </div>
      <div className="mt-8"><Button asChild variant="accent"><Link to="/build">Build with us</Link></Button></div>
    </article>
  );
}