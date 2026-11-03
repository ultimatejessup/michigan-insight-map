-- ============================================================================
-- FOR REVIEW ONLY. Nothing in this file has been run against the database.
-- Project: uxiacizacttosfxolajq (the existing Michigan Essentials Watch project)
-- ============================================================================
--
-- WHY
-- Both tables below have row-level security (RLS) turned on but no policy, so
-- the public (browser) key can read zero rows from them. The tracker needs:
--
--   energy_burden_lead_mi          County energy burden from the DOE/NREL LEAD
--                                  Tool (498 rows: 83 counties x 6 income
--                                  brackets). Drives the map shading and the
--                                  county energy burden card.
--   water_sewage_service_counties  Links water/sewer systems to counties
--                                  (8 rows). Not used by the page yet; included
--                                  so the water tab can show county coverage later.
--
-- WHAT IT CHANGES
-- Adds one read-only policy to each table, the same "public read" policy the
-- other tracker tables already have (geographies, utility_rate_history_mi,
-- mpsc_rate_actions, water_sewage_rates, ...).
--
-- WHAT IT DOES NOT CHANGE
-- No insert, update or delete access is granted. RLS stays on. No other table,
-- column or existing policy is touched. Both tables hold published,
-- county-level figures and system-to-county links, with no personal data.
--
-- HOW TO CHECK THE RESULT (run after applying)
--   begin;
--   set local role anon;
--   select count(*) from public.energy_burden_lead_mi;           -- expect 498
--   select count(*) from public.water_sewage_service_counties;   -- expect 8
--   rollback;
--
-- HOW TO UNDO
--   drop policy "public read" on public.energy_burden_lead_mi;
--   drop policy "public read" on public.water_sewage_service_counties;
-- ============================================================================

drop policy if exists "public read" on public.energy_burden_lead_mi;
create policy "public read"
  on public.energy_burden_lead_mi
  for select
  using (true);

drop policy if exists "public read" on public.water_sewage_service_counties;
create policy "public read"
  on public.water_sewage_service_counties
  for select
  using (true);
