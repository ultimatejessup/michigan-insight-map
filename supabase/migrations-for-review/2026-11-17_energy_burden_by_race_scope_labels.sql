-- FOR OWNER REVIEW. Not applied. Nothing in the site requires it: until it is applied, the race
-- reference panel lists every row under "Study area not labeled".
--
-- Why: energy_burden_by_race mixes national, 48-city and Detroit-metro studies. The site must
-- say which is which. These two nullable columns hold the label; no existing value is changed.
--
-- Labels below come from each row's stored data_year, source and notes. Rows 11 (Hispanic, 20%
-- above white households) and 15 (low-income 8.4%) are less clear: please confirm or correct
-- them. Row 12 has no number, so the site never shows it; row 15 is left unlabeled.

alter table public.energy_burden_by_race
  add column if not exists study_scope text,
  add column if not exists burden_measure text;

comment on column public.energy_burden_by_race.study_scope is
  'Where the study applies, e.g. National, Detroit metro, 48 U.S. cities. Not a Michigan or county figure.';
comment on column public.energy_burden_by_race.burden_measure is
  'What the percentage measures when it is not the default (median share of income on home energy).';

update public.energy_burden_by_race set study_scope = 'National',      burden_measure = 'Median share of income on home energy' where id = 1;
update public.energy_burden_by_race set study_scope = 'Detroit metro', burden_measure = 'Median share of income on home energy' where id = 2;
update public.energy_burden_by_race set study_scope = '48 U.S. cities', burden_measure = 'Median share of income on home energy' where id = 3;
update public.energy_burden_by_race set study_scope = 'National',      burden_measure = 'Median share of income on home energy' where id = 4;
update public.energy_burden_by_race set study_scope = 'National',      burden_measure = 'Home energy plus transportation fuel combined' where id = 5;
update public.energy_burden_by_race set study_scope = '48 U.S. cities', burden_measure = 'Median share of income on home energy' where id = 6;
update public.energy_burden_by_race set study_scope = 'Detroit metro' where id = 7;
update public.energy_burden_by_race set study_scope = 'National'      where id = 9;
update public.energy_burden_by_race set study_scope = 'Detroit metro', burden_measure = 'Median share of income on home energy' where id = 10;
update public.energy_burden_by_race set study_scope = 'National'      where id = 11;  -- confirm
update public.energy_burden_by_race set study_scope = 'Detroit metro', burden_measure = 'Median share of income on home energy' where id = 14;
-- id 15 left unlabeled on purpose (source cites both 2020 and 2024 studies).
