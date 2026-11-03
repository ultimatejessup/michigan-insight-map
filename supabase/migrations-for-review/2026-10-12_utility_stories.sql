-- ============================================================================
-- PROPOSAL FOR REVIEW ONLY. Not applied. Nothing on the site reads or writes
-- this table yet. See migrations-for-review/utility-stories-proposal.md for the full reasoning.
-- Project: uxiacizacttosfxolajq. Checked: no stories table exists today, and
-- public.geographies.id is uuid (level, geoid, name are text).
-- ============================================================================
--
-- DESIGN IN ONE PARAGRAPH
-- The public (anon) key can NEVER write or read this table directly. Stories
-- arrive through a server function that holds the service-role key, checks
-- Turnstile, validates, and inserts. The public reads approved stories only,
-- through a view that exposes a short list of safe columns. Email, last name,
-- bill amount, and the reviewer's notes are never in that view.
--
-- UNDO
--   drop view  if exists public.utility_stories_public;
--   drop table if exists public.utility_stories;
-- ============================================================================

create table if not exists public.utility_stories (
  id                    uuid primary key default gen_random_uuid(),

  -- what the story is about (matches the form's choices)
  utility_type          text not null
                        check (utility_type in ('electric', 'gas', 'water', 'broadband')),
  issues                text[] not null default '{}',
  county_geography_id   uuid not null references public.geographies (id),
  city                  text check (city is null or char_length(city) <= 80),
  provider_name         text check (provider_name is null or char_length(provider_name) <= 120),

  story                 text not null
                        check (char_length(story) between 10 and 1500),
  monthly_bill_usd      numeric(8, 2) check (monthly_bill_usd is null or monthly_bill_usd >= 0),

  -- how the person wants to appear
  name_preference       text not null default 'anonymous'
                        check (name_preference in ('anonymous', 'first_name', 'full_name')),
  display_name          text check (display_name is null or char_length(display_name) <= 80),

  -- private contact: never exposed publicly
  email                 text check (email is null or char_length(email) <= 255),

  -- consent, recorded as given at submission time
  consent_to_publish    boolean not null check (consent_to_publish is true),
  consent_updates       boolean not null default false,
  consent_recorded_at   timestamptz not null default now(),

  -- moderation
  status                text not null default 'pending'
                        check (status in ('pending', 'approved', 'rejected')),
  reviewed_at           timestamptz,
  reviewer_note         text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- a named display needs a name; anonymous must not carry one
  constraint stories_name_consistent check (
    (name_preference = 'anonymous' and display_name is null)
    or (name_preference <> 'anonymous' and display_name is not null)
  )
);

create index if not exists utility_stories_status_idx
  on public.utility_stories (status, created_at desc);
create index if not exists utility_stories_county_idx
  on public.utility_stories (county_geography_id);

-- Row-level security ON with NO policies: the anon and authenticated roles can
-- neither read nor write the base table. The server function uses the
-- service-role key, which bypasses RLS.
alter table public.utility_stories enable row level security;
revoke all on public.utility_stories from anon, authenticated;

-- Public read path: approved + consented stories only, safe columns only.
-- The first-name rule is applied HERE, in the database, so a front-end bug
-- cannot leak a last name.
create or replace view public.utility_stories_public
with (security_invoker = false) as
select
  s.id,
  s.utility_type,
  s.issues,
  g.name as county_name,
  s.city,
  s.provider_name,
  s.story,
  case s.name_preference
    when 'anonymous'  then 'Anonymous'
    when 'first_name' then split_part(s.display_name, ' ', 1)
    else s.display_name
  end as display_name,
  s.created_at
from public.utility_stories s
join public.geographies g on g.id = s.county_geography_id
where s.status = 'approved'
  and s.consent_to_publish is true;

revoke all on public.utility_stories_public from anon, authenticated;
grant select on public.utility_stories_public to anon, authenticated;

-- Keep updated_at honest.
create or replace function public.utility_stories_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists utility_stories_touch on public.utility_stories;
create trigger utility_stories_touch
before update on public.utility_stories
for each row execute function public.utility_stories_touch();

-- NOT included on purpose: any insert policy for anon. Adding one would let
-- anyone on the internet post to the table without Turnstile.
--
-- Review notes:
--  * The view runs with the owner's rights (security_invoker = false) so it can
--    read the locked table. Supabase's security advisor flags this pattern; it
--    is intentional here because the view's WHERE clause and column list are the
--    access rule. Run get_advisors after applying.
--  * monthly_bill_usd is collected for aggregate use only and is not in the view.
--  * A story's text may still contain names, addresses or account numbers.
--    Moderators must read every story before approving it.
