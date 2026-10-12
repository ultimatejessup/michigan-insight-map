# Claude handoff — Michigan Essentials Watch

Read `AGENTS.md` before making changes.

## Transfer state
- Main navigation includes Tracker, Survey, Pledge, Bill Check and Build. The header no longer has the organizational byline.
- Footer site links include Disclaimers together with Tracker, Survey, Pledge, Bill Check, Build and Origins, with contact beside them; the exact non-endorsement line sits below a divider.
- `/disclaimers` holds the detailed data privacy, terms of service and content rights notices. Keep the short non-endorsement line in the shared footer.
- `/origins` explains the purpose, Liberation Caucus direction and Lovable-assisted development, without claiming a fully loaded tracker.
- `/build` offers campaign, newsletter and SMS choices through an explicit email-request flow, not automated enrollment.
- The contact email is **power@miutilitieswatch.com**. Preserve that exact spelling; it differs from the canonical website domain, **https://miutilitywatch.com**.

## Resident trust: AI bill reading
The owner is concerned that sending a personal utility bill to AI may discourage residents from using Bill check. This is a concern to address, not permission to hide AI involvement or change providers.

- Keep Bill check optional; the tracker and other pages remain usable without uploading a bill.
- Clearly disclose AI processing before upload, in plain language.
- Explain that uploads are not stored by this site or published. Do not extend that claim to provider retention, model training or deletion guarantees without verified provider terms.
- Encourage residents to cover account numbers, names and addresses before uploading.
- Keep the AI accuracy warning and the ability to stop generation.
- Do not promise anonymity: the uploaded document can contain personal information.
- On-device redaction was built then removed at the owner's request (Oct 12). Uploads are plain photos/PDFs; the page only encourages residents to cover personal details themselves. Story-form bill attachments were removed with it.

## Current implementation
- `src/components/site/site-header.tsx`: shared navigation, stacked at narrow widths.
- `src/components/site/site-footer.tsx`: shared footer, including the supplied email.
- `src/routes/disclaimers.tsx`: public notices page with unique metadata; basic informational notices, not lawyer-reviewed terms.
- `src/routes/origins.tsx`: factual development and advocacy background.
- `src/routes/build.tsx`: native form validation, update preferences and mailto draft. Visitors must send the draft; SMS is a request for opt-in instructions only.
- `src/routes/bill-check.tsx`: upload page, streamed explanation, explicit Stop action and accuracy disclaimer.
- `src/lib/ai/bill-explainer.server.ts`: validates file size/type and calls the Lovable AI Gateway Responses API; the API key stays server-side, provider storage is disabled and uploads are not persisted by the app.
- `/api/bill-explain`: existing streaming endpoint. Do not add artificial generation deadlines.

## Limits and outstanding work
- Notices are basic site statements, not a comprehensive legal privacy policy, lawyer-reviewed terms or a verified licensing agreement. Provider data practices remain unverified.
- Existing Supabase project `uxiacizacttosfxolajq` must be connected by the owner; do not create a replacement. Inspect and list tables/columns to the owner before writing data reads. Reuse existing tables; show any requested migration for review before applying it.
- Tracker real data, story/pledge persistence and survey submission remain blocked by the connection. The survey also needs the owner’s question bank and page component; Turnstile needs configured keys.
- Newsletter and SMS storage/delivery are not connected. Never replace the email-request notice with a “subscribed” confirmation until enrollment actually succeeds.
- Never put server credentials in source or browser code. Preserve the server-side AI key boundary.
- Do not invent a postal address, phone number, licensing terms or promises about AI-provider handling.
- Existing database-dependent tracker data and submission flows remain blocked; see `roadmap.md`. These updates do not connect data or enable saving.
- Preserve the existing civic branding, source requirements, signatory privacy and content guardrails.

## Transfer verification checklist
- Follow footer Origins and legal links and confirm their destination headings and metadata.
- Confirm links/contact precede legal notices, including at narrow widths.
- Check the Build form with no preference selected and with newsletter/SMS selected. The latter must prepare a draft, not claim delivered email or enrollment.
- Check the latest preview build log and run relevant tests after future changes. A previous browser check surfaced a tracker map hydration warning; no map fix was included in these footer updates.