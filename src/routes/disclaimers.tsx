import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/disclaimers")({
  head: () => pageHead(
    "/disclaimers",
    "Privacy, Terms & Content Rights — Michigan Essentials Watch",
    "Data privacy, terms of service, content rights and non-endorsement notices for Michigan Essentials Watch.",
  ),
  component: DisclaimersPage,
});

function DisclaimersPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="font-semibold text-accent-strong">Michigan Essentials Watch</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-primary sm:text-4xl">Privacy, terms & content rights</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">Information about using this site and choosing what to share.</p>
      <div className="mt-8 space-y-8 border-t pt-8 text-base leading-relaxed">
        <section aria-labelledby="privacy-heading">
          <h2 id="privacy-heading" className="font-display text-2xl font-bold">Data privacy</h2>
          <p className="mt-3">Bill Check is optional. Your photo or PDF is read on your own device and is never uploaded. The explanation is also created in your browser, from a reviewed list of common Michigan bill terms, so the text of your bill is not sent to this site, to an AI service or to anyone else, and is not saved or published. Personal details such as account numbers and addresses are hidden automatically in the text box, which is helpful if you share a screenshot, but automatic hiding is not perfect. You can use the tracker without using Bill Check.</p>
          <p className="mt-3">Your browser may keep ordinary data, such as the page itself, as it does for any website. This site does not receive the text of your bill.</p>
          <p className="mt-3">Build signup requests are currently handled by email. The form prepares an email draft; the request reaches the team only when you send it. Contact details are not published on this site. A request for SMS instructions does not enroll you in texts.</p>
          <p className="mt-3">For privacy questions, contact <a href="mailto:power@miutilitywatch.com" className="break-all font-semibold text-primary underline underline-offset-4">power@miutilitywatch.com</a>.</p>
        </section>
        <section aria-labelledby="terms-heading">
          <h2 id="terms-heading" className="font-display text-2xl font-bold">Terms of service</h2>
          <p className="mt-3">The site provides general utility information and advocacy resources. It does not provide legal or financial advice. Verify figures with their cited sources and confirm billing questions with your provider before acting.</p>
          <p className="mt-3">Bill Check explanations are general descriptions of common charges. They can be incomplete, and a charge with the same name can work differently for different providers. Check each explanation against your original bill and confirm anything important with your provider. Use Bill Check only with documents you own or have permission to use.</p>
          <p className="mt-3">Some data and submission services are not yet connected. A “Data coming soon” notice is not a utility rate or a finding about a county. Follow each form’s availability notice; a form preview is not confirmation that a submission has been saved.</p>
        </section>
        <section aria-labelledby="rights-heading">
          <h2 id="rights-heading" className="font-display text-2xl font-bold">Content rights</h2>
          <p className="mt-3">Original site content © Liberation Caucus. Third-party data and materials remain subject to their owners’ rights and terms. Uploading a document does not authorize this site to publish it. Contact us about permission to reuse original site content.</p>
        </section>
        <section aria-labelledby="endorsement-heading">
          <h2 id="endorsement-heading" className="font-display text-2xl font-bold">Non-endorsement</h2>
          <p className="mt-3">The Liberation Caucus is a non-partisan, non-profit organization. Nothing on this site is an endorsement of any candidate or party.</p>
        </section>
      </div>
    </article>
  );
}