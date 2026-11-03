-- Utility Watch: align utility_rate_history_mi.reading_date with the MPSC table date
-- DRAFT FOR REVIEW. Not applied. Review, then run in the Supabase SQL editor.
--
-- Decision (owner, Oct 26 2026): reading_date = the date printed on the MPSC
-- "Comparison of Average Rates for MPSC-Regulated Electric Utilities in Michigan" table.
--
-- Finding: every stored month is one month EARLY relative to that convention.
--   Compared DTE Electric / Consumers Energy / Alpena Power (1,000 kWh column) for the
--   MPSC tables dated 2023-01-01 .. 2026-09-01 against the stored rows:
--     stored month used as-is      -> 4 of 44 overlapping rows match
--     stored month + 1 month       -> 44 of 45 overlapping rows match
--   Example: stored 2026-07 (23.38 / 24.42 / 18.46) equals the MPSC table dated 2026-08-01.
--   Months before 2023 cannot be checked (no earlier MPSC edition found); they are shifted
--   too so the series stays continuous. If you would rather leave 2018-2022 untouched,
--   change the two UPDATE statements to add: and reading_date >= '2022-12-01'
--
-- The one non-matching row is stored 2026-08. Its DTE/Consumers/Alpena values equal stored
-- 2026-07 and do NOT match the MPSC table dated 2026-09-01 (23.40 / 24.45 / 18.48), so it is
-- stale data. Relabeling it to 2026-09 would attach old numbers to a newer table date.
-- This draft deletes those 8 rows first. September 2026 then shows "Data not yet loaded"
-- until it is loaded from the MPSC table with a source.
--   (Indiana Michigan Power stored 16.92 vs 16.94 in July; it cannot be verified from here,
--    so it is removed with the rest rather than kept under an unverified label.)

begin;

-- 1. Remove the stale latest month (pre-shift label 2026-08).
delete from public.utility_rate_history_mi
where reading_date = date '2026-08-01';

-- 2. Shift every remaining row forward one month. Two steps because
--    UNIQUE (utility, reading_date) is checked row by row, so a direct +1 month
--    update can collide with a neighbouring row mid-statement.
update public.utility_rate_history_mi
set reading_date = (reading_date + interval '1000 years')::date
where reading_date is not null;

update public.utility_rate_history_mi
set reading_date = (reading_date - interval '1000 years' + interval '1 month')::date
where reading_date >= date '3000-01-01';

comment on column public.utility_rate_history_mi.reading_date is
  'Date printed on the MPSC Comparison of Average Rates table the value comes from (first of month).';

-- 3. Checks. Expect: first_date 2018-06-01, last_date 2026-08-01 (the old 2026-07 row, now
--    matching the MPSC table dated 2026-08-01), stray_far_future_rows 0,
--    DTE 2023-02-01 = 18.61, Consumers 2023-02-01 = 20.53, Alpena 2023-02-01 = 14.56,
--    DTE 2026-08-01 = 23.38, and no row dated 2026-09-01 (that month is not loaded yet).
select min(reading_date) first_date, max(reading_date) last_date,
       count(*) filter (where reading_date > date '2100-01-01') as stray_far_future_rows
from public.utility_rate_history_mi;

select utility, to_char(reading_date,'YYYY-MM-DD') table_date, residential_rate_cents_kwh
from public.utility_rate_history_mi
where utility in ('DTE Electric','Consumers Energy','Alpena Power')
  and reading_date in (date '2023-02-01', date '2026-07-01', date '2026-08-01')
order by utility, reading_date;

-- If the checks look right, run COMMIT; otherwise run ROLLBACK;
-- commit;
-- rollback;
