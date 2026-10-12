# Michigan Essentials Watch — roadmap (restarted Oct 12)

- [x] Name "Michigan Essentials Watch" by Liberation Caucus; title "Michigan" black + rest blue, Zap badge
- [x] Canonical + OG on https://miutilitywatch.com per route
- [x] Routes: / tracker, /survey, /pledge; header nav; footer non-endorsement line
- [x] Tracker: map left / details right, no invented data ("coming soon")
- [x] Survey form and Pledge page UI (not saving yet)
- [ ] Connect existing Supabase project uxiacizacttosfxolajq — BLOCKED: user must connect it (Cloud view → "Connect it here", or Connectors → Supabase)
- [ ] After connecting: list existing tables + columns for the user, get approval, then wire reads (anon key only)

Guardrails: no ten-member proposal, no HB 4918, never invent data, party never public, every figure sourced.

## Tracker data spec (Oct 12) — BLOCKED on database connection
- [ ] Map from geographies (level='county', Michigan), color by metric, legend, "Reset to statewide" button
- [ ] Electric: monthly rates May 2018–Aug 2026 (never annual), DTE vs Consumers, mpsc_rate_actions, state_rate_comparison
- [ ] Natural Gas: show existing data or "Data not yet loaded" + planned source
- [ ] Water: water_sewage_rates + flag "Water rates in Michigan are generally not set by the MPSC."
- [ ] Broadband: FCC BDC, headline excludes satellite / "Any Technology", state exclusion
- [ ] energy_burden (DOE LEAD) by county; energy_burden_by_race as separate card, never joined to map/charts
- [ ] Source link per number from row source field; no source -> "Source pending", hide number
- [ ] Per-tab coverage note (loaded / not loaded / last verified)
- [ ] No computed aggregates — stored values only

## Home story form (Oct 12) — BLOCKED on database connection
- [ ] Check for existing stories table; reuse if present, else PROPOSE utility_stories for review before any migration
- [ ] Form below tracker: consent checkbox + privacy sentence; public shows approved + consent_to_publish only; never email/phone/last name
- [ ] Cloudflare Turnstile verified server-side; browser never inserts directly (needs Turnstile keys)

## Survey (Oct 12) — BLOCKED
- [ ] Use existing question-bank file + survey page component — BLOCKED: neither exists in this project; need the files from user
- [ ] Tables utility_survey_participants + utility_survey_responses (participant_id nullable); bill impact & cost-coping only, NO commission-reform questions
- [ ] Turnstile (VITE_TURNSTILE_SITE_KEY), submit disabled until token, reset after failed submit
- [ ] submit-utility-survey function verifies token, calls save function via service role; CORS limited to miutilitywatch.com, www, preview
- [ ] Migration SQL: revoke execute on save fn from anon/authenticated/public, grant to service_role — SHOW FOR REVIEW, do not apply

## Pledge (Oct 12)
- [x] Pledge #1 copy (HB 5676-5677, five-member), disclaimer visible, Pledge #2 "coming soon" card with no details
- [ ] Check for existing pledge table; reuse if present — BLOCKED on database connection
- [ ] Signers list: name, office sought, date signed only; Turnstile-protected submit, status pending until staff approval
