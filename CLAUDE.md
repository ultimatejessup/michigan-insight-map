# Claude handoff — Michigan Essentials Watch

Read `AGENTS.md` before making changes.

## Requested updates
- Main navigation includes Tracker, Survey, Pledge and Bill check.
- Every page shares a footer with data privacy, content rights, contact information and the existing non-endorsement disclaimer.
- The contact email is **power@miutilitieswatch.com**. Preserve that exact spelling; it differs from the canonical website domain, **https://miutilitywatch.com**.

## Resident trust: AI bill reading
The owner is concerned that sending a personal utility bill to AI may discourage residents from using Bill check. This is a concern to address, not permission to hide AI involvement or change providers.

- Keep Bill check optional; the tracker and other pages remain usable without uploading a bill.
- Clearly disclose AI processing before upload, in plain language.
- Explain that uploads are not stored by this site or published. Do not extend that claim to provider retention, model training or deletion guarantees without verified provider terms.
- Encourage residents to cover account numbers, names and addresses before uploading.
- Keep the AI accuracy warning and the ability to stop generation.
- Do not promise anonymity: the uploaded document can contain personal information.
- Possible future work for owner review: a no-upload guide to common charges, or local redaction before upload. Neither is implemented or approved by this request.

## Current implementation
- `src/components/site/site-header.tsx`: shared navigation, stacked at narrow widths.
- `src/components/site/site-footer.tsx`: shared footer, including the supplied email.
- `src/routes/bill-check.tsx`: upload page, streamed explanation, explicit Stop action and accuracy disclaimer.
- `src/lib/ai/bill-explainer.server.ts`: validates file size/type and calls the Lovable AI Gateway Responses API; the API key stays server-side, provider storage is disabled and uploads are not persisted by the app.
- `/api/bill-explain`: existing streaming endpoint. Do not add artificial generation deadlines.

## Limits and outstanding work
- Footer wording is a basic site statement, not a comprehensive legal privacy policy or a verified licensing agreement.
- Do not invent a postal address, phone number, licensing terms or promises about AI-provider handling.
- Existing database-dependent tracker data and submission flows remain blocked; see `roadmap.md`. These updates do not connect data or enable saving.
- Preserve the existing civic branding, source requirements, signatory privacy and content guardrails.