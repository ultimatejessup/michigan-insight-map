-- ============================================================================
-- DRAFT FOR REVIEW ONLY. Not applied. Run in the Supabase SQL editor after review.
-- Project: uxiacizacttosfxolajq
-- ============================================================================
--
-- WHY
-- The Supabase security advisor (Oct 31, 2026) reported three items this script
-- can fix without changing how the site behaves:
--
--   1) public.rls_auto_enable() is SECURITY DEFINER and callable by anon and
--      authenticated through /rest/v1/rpc/rls_auto_enable. It is an event-trigger
--      function (it turns RLS on for new tables). Event triggers do not need
--      EXECUTE granted to API roles, so the grant can be removed.
--   2) public.set_updated_at() has a mutable search_path. Its body only calls
--      now(), so pinning an empty search_path changes nothing.
--   3) public.geo_crosswalk_set_parent_level() has a mutable search_path. Its body
--      reads `geographies` without a schema, so the function is recreated with the
--      table written as public.geographies and an empty search_path. Logic is
--      otherwise identical (same trigger, same behavior).
--
-- WHAT IT DOES NOT CHANGE
-- No table, column, policy, view or data row is touched. Triggers keep pointing
-- at the same function names.
--
-- DELIBERATELY LEFT ALONE (see supabase/README.md)
--   * utility_stories_public is SECURITY DEFINER on purpose (documented in
--     2026-10-12_utility_stories.sql); the advisor ERROR for it is expected.
--   * legislator_alignment_index is also SECURITY DEFINER; it belongs to another
--     feature and needs its own decision.
--   * citext, pg_trgm, pg_net live in the public schema. Moving extensions can
--     break dependent columns and indexes, so it is not bundled here.
--   * RLS-with-no-policy INFO items are the intended "locked" state for private tables.
--
-- HOW TO CHECK THE RESULT
--   select has_function_privilege('anon', 'public.rls_auto_enable()', 'execute');   -- expect false
--   select has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute'); -- expect false
--   select proname, proconfig from pg_proc
--     where pronamespace = 'public'::regnamespace
--       and proname in ('set_updated_at', 'geo_crosswalk_set_parent_level');
--       -- expect proconfig = {search_path=""} for both
--   then run the security advisor again.
--
-- HOW TO UNDO
--   grant execute on function public.rls_auto_enable() to public;  -- restores the old grant
--   alter function public.set_updated_at() reset search_path;
--   alter function public.geo_crosswalk_set_parent_level() reset search_path;
-- ============================================================================

begin;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

alter function public.set_updated_at() set search_path = '';

create or replace function public.geo_crosswalk_set_parent_level()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_level is null then
    select level into new.parent_level
    from public.geographies
    where id = new.parent_geography_id;
  end if;
  return new;
end;
$$;

-- Verify, then run COMMIT; (or ROLLBACK; to discard).
select has_function_privilege('anon', 'public.rls_auto_enable()', 'execute') as anon_can_execute;
select proname, proconfig
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('set_updated_at', 'geo_crosswalk_set_parent_level');

-- commit;
-- rollback;
