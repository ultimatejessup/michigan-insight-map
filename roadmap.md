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
