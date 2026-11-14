# Claude handoff — Michigan Essentials Watch

Read `AGENTS.md` before making changes.

## Transfer state
- Main navigation includes Tracker, Survey, Pledge, Bill Check and Build. The header no longer has the organizational byline.
- Footer site links include Disclaimers together with Tracker, Survey, Pledge, Bill Check, Build and Origins, with contact beside them; the exact non-endorsement line sits below a divider.
- `/disclaimers` holds the detailed data privacy, terms of service and content rights notices. Keep the short non-endorsement line in the shared footer.
- `/origins` explains the tracker, the Liberation Caucus (approved mission wording) and AI-assisted development without naming the tool, and does not claim a fully loaded tracker. Do not add claims about Michigan Forward or national wage-burden work until the owner supplies facts.
- `/build` offers campaign, newsletter and SMS choices through an explicit email-request flow, not automated enrollment.
- The contact email is **power@miutilitieswatch.com**. Preserve that exact spelling; it differs from the canonical website domain, **https://miutilitywatch.com**.

## Resident trust: AI bill reading
The owner is concerned that sending a personal utility bill to AI may discourage residents from using Bill check. This is a concern to address, not permission to hide AI involvement or change providers.

- Keep Bill check optional; the tracker and other pages remain usable without uploading a bill.
- Clearly disclose AI processing before anything is sent, in plain language.
- Explain that the bill text is not stored by this site or published. Do not extend that claim to provider retention, model training or deletion guarantees without verified provider terms.
- Encourage residents to review the text and remove any personal details the automatic hiding missed.
- Keep the AI accuracy warning and the ability to stop generation.
- Do not promise anonymity: the reviewed text can still contain personal information.
- On-device redaction was removed on Oct 12 because the process was not clear, and restored on Oct 26 with a clearer three-step flow: (1) choose the bill, (2) review the extracted text, (3) get the explanation. The photo/PDF never leaves the device; the browser extracts text (pdf.js, or self-hosted Tesseract OCR from `/ocr` for photos and scanned PDFs), hides personal details, and the resident can edit the text before pressing "Send this text". Only that reviewed text is sent. Keep the "Nothing has been sent yet" notice, the [REDACTED] summary (never list the hidden values) and the pre-send check. Redaction is best-effort and the page must not claim it is complete. City, state and ZIP are intentionally kept. Story-form bill attachments stay removed.

## Current implementation
- `src/components/site/site-header.tsx`: shared navigation, stacked at narrow widths.
- `src/components/site/site-footer.tsx`: shared footer, including the supplied email.
- `src/routes/disclaimers.tsx`: public notices page with unique metadata; basic informational notices, not lawyer-reviewed terms.
- `src/routes/origins.tsx`: factual development and advocacy background.
- `src/routes/build.tsx`: native form validation, update preferences and mailto draft. Visitors must send the draft; SMS is a request for opt-in instructions only.
- `src/routes/bill-check.tsx`: three-step page (choose, review/edit extracted text, explanation), explicit Stop action and accuracy disclaimer.
- `src/lib/bill/redact.ts`: pure on-device redaction (account/ID numbers, addresses, names, phones, emails, resident-supplied words). `src/lib/bill/extract.ts`: browser-only extraction; do not rename it `*.client.*` (TanStack import protection blocks that). `tests/redact.test.ts`: run with `bun test tests/redact.test.ts`.
- `public/ocr/`: self-hosted OCR worker, core and English model so no third-party site is contacted. Keep absolute URLs when changing OCR paths (the worker runs from a blob URL).
- `src/lib/ai/bill-explainer.server.ts`: accepts JSON `{ text }` (reviewed bill text, 40-30,000 characters), no files, and calls the Lovable AI Gateway Responses API; the API key (`LOVABLE_API_KEY`) stays server-side, provider storage is disabled and nothing is persisted by the app.
- `src/lib/rates/electric-rates.ts` + `src/components/site/electric-rate-history.tsx`: Electric tab (all regulated utilities shown by default; selecting a county filters to the utilities in `electric_service_territory_mi`, loaded from EIA-861 2025 for the 7 utilities with MPSC rate series only; co-ops and municipals are intentionally not stored, UMERC WEPCo = 10 counties and WPSC = Menominee only, per UMERC's MPSC rate book) reads `utility_rate_history_mi` (Electric rows) from the existing Supabase project over the public REST endpoint with the publishable key (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; see `.env.example`). Stored values only, no computed changes. `reading_date` is the MPSC table date. `verification_status` shows as "Checked against the MPSC table", "Source linked" or "Data collection in progress"; never show the raw value or the words "needs review". Rows before 2023 are shown and labeled (flip `HIDE_ROWS_WITHOUT_SOURCE_LINK` to hide unlinked rows). Tests: `bun test tests/electric-rates.test.ts`.
- `src/lib/census/` + `county-profile-card.tsx` + `energy-burden-section.tsx`: county card (ACS 5-year population, median household income, Black population share from `geo_demographics` / `geo_demographics_race`) and energy burden (DOE LEAD, `energy_burden_lead_mi`, ALL bracket plus five income brackets) read over the public REST endpoint. Stored values only: no statewide average or comparison is computed because none is stored. Households and poverty rate are empty in `geo_demographics`; unemployment tables are empty. Tests: `bun test tests/county-profile.test.ts tests/energy-burden.test.ts`.
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