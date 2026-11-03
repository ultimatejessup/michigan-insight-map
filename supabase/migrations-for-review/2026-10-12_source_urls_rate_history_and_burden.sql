-- ============================================================================
-- FOR REVIEW ONLY. Nothing in this file has been run against the database.
-- Project: uxiacizacttosfxolajq (the existing Michigan Essentials Watch project)
-- ============================================================================
--
-- WHY
-- utility_rate_history_mi and energy_burden_lead_mi name their source in text
-- ("source" / "source_document") but have no link column, so the tracker cannot
-- show a clickable source for those figures. This adds a nullable `source_url`
-- column to each and fills it ONLY where the link was checked.
--
-- SAFE TO APPLY BEFORE OR AFTER THE SITE UPDATE
-- The new code asks for source_url, and quietly falls back to the old query if
-- the column does not exist yet. Nothing breaks either way.
--
-- WHAT WAS CHECKED (Oct 12, 2026)
--
-- 1) LEAD burden (498 rows) -> https://data.openei.org/submissions/6219
--    All 498 rows already cite "OEDI submission 6219". That page exists and is
--    titled "Low-Income Energy Affordability Data - LEAD Tool - 2022 Update"
--    (DOI 10.25984/2504170). NOT checked: the individual county values, because
--    the Michigan file is a ~242 MB zip. The link points to the dataset the rows
--    already cite; it does not prove each number.
--
-- 2) Electric rate history -> https://www.michigan.gov/documents/mpsc/rates1_594951_7.pdf
--    That PDF is titled "COMPARISON OF AVERAGE RATES (IN CENTS PER kWh) FOR
--    MPSC-REGULATED ELECTRIC UTILITIES IN MICHIGAN", with one table per month.
--    I compared the 1,000 kWh residential column against your database for DTE
--    Electric, Consumers Energy and Alpena Power: every month of 2023 and every
--    month from Oct 2025 to Jul 2026. All of those match exactly.
--    NOT individually checked: the other five utilities, and 2024 through
--    Sep 2025 (the PDF has those tables; I did not compare them number by number).
--
-- THREE THINGS YOU SHOULD KNOW BEFORE APPLYING
--
-- A) One-month offset. In the PDF, the table dated the 1st of a month carries the
--    figures your database stores under the PREVIOUS month. Example: the PDF's
--    "February 1, 2023" table has DTE 18.61 / Consumers 20.53 / Alpena 14.56;
--    your database stores those under 2023-01-01. The same offset holds for
--    every month I checked through Jul 2026. Which label is right is your call
--    (for example, the table may report the prior month's billing). The site now
--    says "table dated the 1st of the following month" next to the link so
--    readers are not confused. This file does not change any date.
--
-- B) The 2026-08 row is excluded. By the offset above, 2026-08 should match the
--    PDF's "September 1, 2026" table: DTE 23.40 / Consumers 24.45 / Alpena 18.48.
--    Your 2026-08 rows hold 23.38 / 24.42 / 18.46, identical to 2026-07, which
--    looks like July's values carried forward. So the 2026-08 rows are left
--    unlinked. Please look at that table in the PDF; the figures above come from
--    my reading of it. This is also the "latest reading" the tracker shows.
--
-- C) 2018-05 to 2022-12 is excluded. The PDF starts in January 2023 and I could
--    not find the earlier monthly editions, so those rows stay text-only.
--
-- WHAT IT DOES NOT CHANGE
-- No existing value, date or text is altered. Only the two new columns are
-- filled, and only where the WHERE clause matches. RLS and policies are untouched.
-- The columns accept only http(s) links.
--
-- HOW TO CHECK THE RESULT (run after applying)
--   select count(*) from public.utility_rate_history_mi where source_url is not null;  -- expect 344
--   select min(reading_date), max(reading_date) from public.utility_rate_history_mi
--     where source_url is not null;                              -- 2023-01-01 .. 2026-07-01
--   select count(*) from public.energy_burden_lead_mi where source_url is not null;    -- expect 498
--
-- HOW TO UNDO
--   alter table public.utility_rate_history_mi drop column source_url;
--   alter table public.energy_burden_lead_mi   drop column source_url;
-- ============================================================================

alter table public.utility_rate_history_mi
  add column if not exists source_url text
  check (source_url is null or source_url ~* '^https?://');

alter table public.energy_burden_lead_mi
  add column if not exists source_url text
  check (source_url is null or source_url ~* '^https?://');

-- Rate history: only the months that were matched against the PDF (344 rows =
-- 43 months x 8 utilities).
update public.utility_rate_history_mi
set source_url = 'https://www.michigan.gov/documents/mpsc/rates1_594951_7.pdf'
where service_type = 'Electric'
  and reading_date >= date '2023-01-01'
  and reading_date <= date '2026-07-01'
  and source_url is null;

-- LEAD: every row already cites OEDI submission 6219 (498 rows).
update public.energy_burden_lead_mi
set source_url = 'https://data.openei.org/submissions/6219'
where source_document ilike '%OEDI submission 6219%'
  and source_url is null;
