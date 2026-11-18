-- DRAFT for owner review. Not applied.
-- EGLE Distribution System Materials Inventory (DSMI) service line counts by public water supply.
-- Source: michigan.gov/egle DSMI inventories page, file DSMI-Service-Line-Materials-Estimates.xlsx ("updated March 2025").
-- Blank cells in the source are stored as NULL (not zero). No county column: the file has none.
create table if not exists public.water_service_line_inventory (
  id bigint generated always as identity primary key,
  pws_id text not null unique,
  supply_name text not null,
  lead_lines integer,
  galvanized_prev_lead_lines integer,
  non_lead_lines integer,
  lead_status_unknown_lines integer,
  total_service_lines integer,
  as_of text not null default 'March 2025',
  source_url text not null default 'https://www.michigan.gov/egle/about/organization/drinking-water-and-environmental-health/community-water-supply/lead-and-copper-rule/dsmi/dsmi-inventories',
  created_at timestamptz not null default now()
);
alter table public.water_service_line_inventory enable row level security;
create policy "Public read water_service_line_inventory" on public.water_service_line_inventory for select using (true);
