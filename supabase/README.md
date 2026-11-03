# Supabase scripts

Project: `uxiacizacttosfxolajq` (the existing Michigan Essentials Watch project; do not create a replacement).

Scripts in `migrations-for-review/` are **drafts for the owner to review**. They were applied (or not) by hand in the Supabase SQL editor, so they do not appear in the project's migration list. Never apply one from code or CI. Show it to the owner first.

## Status as of Oct 31, 2026 (checked read-only against the live database)

| Script | Status | Evidence |
| --- | --- | --- |
| `2026-10-12_public_read_energy_burden_and_water_counties.sql` | Applied | One policy each on `energy_burden_lead_mi` and `water_sewage_service_counties` |
| `2026-10-12_source_urls_rate_history_and_burden.sql` | Applied | `source_url` columns exist; 344 rate rows (2023-01-01 to 2026-07-01) and 498 burden rows are linked |
| `2026-10-12_utility_stories.sql` | Applied | `utility_stories` table and `utility_stories_public` view exist; 0 story rows |
| `2026-10-26_shift_rate_history_to_mpsc_table_date.sql` | **Pending** | Rate history still spans 2018-05-01 to 2026-08-01, and 8 stale 2026-08 rows are still there |
| `2026-10-31_security_advisor_hardening.sql` | **New draft** | Fixes three advisor findings (see the file header) |

## Order

1. Run the date shift (`2026-10-26`). The `source_url` values already sit on the rows, so they move with their dates: the 344 linked rows end up at 2023-02-01 to 2026-08-01. The row now dated 2023-01-01 (old 2022-12) stays unlinked, which matches what was verified.
2. Run the hardening script (`2026-10-31`) at any time. It does not touch data.
3. After the shift, load the MPSC table dated 2026-09-01 with a source. Until then September 2026 should show "Data not yet loaded".

Each file has its own check queries and undo notes in its header.

## Advisor findings left on purpose

- `utility_stories_public` is SECURITY DEFINER by design (the view's column list and WHERE clause are the access rule). Expect the advisor ERROR until the design is changed.
- `legislator_alignment_index` is also SECURITY DEFINER. It belongs to another feature and needs its own decision.
- `citext`, `pg_trgm` and `pg_net` are installed in `public`. Moving them can break dependent objects.
- Tables with RLS on and no policy (`quotes`, `substack_posts`, `membership_submissions`, ...) are locked to the public key. That is the intended state for private tables.
