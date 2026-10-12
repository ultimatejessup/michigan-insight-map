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
          <p className="mt-3">Bill Check is optional. Uploaded bills are sent to an AI service to create an explanation; they are not saved on this site or published. Cover your account number, name and address before uploading. You can use the tracker without uploading a bill.</p>
          <p className="mt-3">This describes how the site handles bill uploads. It is not a guarantee about the AI provider’s retention or training practices. Do not upload information you are uncomfortable sharing with an AI service.</p>
          <p className="mt-3">Build signup requests are currently handled by email. The form prepares an email draft; the request reaches the team only when you send it. Contact details are not published on this site. A request for SMS instructions does not enroll you in texts.</p>
          <p className="mt-3">For privacy questions, contact <a href="mailto:power@miutilitieswatch.com" className="break-all font-semibold text-primary underline underline-offset-4">power@miutilitieswatch.com</a>.</p>
        </section>
        <section aria-labelledby="terms-heading">
          <h2 id="terms-heading" className="font-display text-2xl font-bold">Terms of service</h2>
          <p className="mt-3">The site provides general utility information and advocacy resources. It does not provide legal or financial advice. Verify figures with their cited sources and confirm billing questions with your provider before acting.</p>
          <p className="mt-3">AI explanations can be incomplete or incorrect. Check each explanation against the original bill. Upload only documents you own or have permission to share, and avoid sharing another person’s private information without their permission.</p>
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