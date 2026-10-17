-- Canonical season id (Portal): YYYY-YY (e.g. 2025-26).
-- Fixes incomplete 20261002160000 which only replaced '/' with '-',
-- leaving YYYY/YYYY → YYYY-YYYY as a duplicate of YYYY-YY.

create or replace function public.normalize_season_id(raw text)
returns text
language plpgsql
immutable
as $$
declare
  s text;
  m text[];
begin
  if raw is null then
    return null;
  end if;

  s := btrim(regexp_replace(raw, E'[\\r\\n]+', '', 'g'));

  -- YYYY-YY or YYYY/YY
  m := regexp_match(s, '^(\d{4})[/-](\d{2})$');
  if m is not null then
    return m[1] || '-' || m[2];
  end if;

  -- YYYY-YYYY or YYYY/YYYY → last two digits of end year
  m := regexp_match(s, '^(\d{4})[/-](\d{4})$');
  if m is not null then
    return m[1] || '-' || right(m[2], 2);
  end if;

  return s;
end;
$$;

comment on function public.normalize_season_id(text) is
  'Normalize season labels to Portal canonical YYYY-YY (accepts / or - and YY or YYYY end).';

revoke all on function public.normalize_season_id(text) from public;
grant execute on function public.normalize_season_id(text) to service_role;

-- league_standings: unique (season, gender, normalized_name).
-- Drop legacy rows that already have a canonical twin, then rewrite survivors.
delete from public.league_standings as legacy
using public.league_standings as canon
where public.normalize_season_id(legacy.season) is distinct from legacy.season
  and canon.season = public.normalize_season_id(legacy.season)
  and canon.gender = legacy.gender
  and canon.normalized_name = legacy.normalized_name
  and canon.id is distinct from legacy.id;

update public.league_standings
set season = public.normalize_season_id(season)
where season is distinct from public.normalize_season_id(season);

-- clothing_storage_locations: unique (code, season) — same merge pattern
do $do$
begin
  if to_regclass('public.clothing_storage_locations') is not null then
    execute $q$
      delete from public.clothing_storage_locations as legacy
      using public.clothing_storage_locations as canon
      where public.normalize_season_id(legacy.season) is distinct from legacy.season
        and canon.season = public.normalize_season_id(legacy.season)
        and canon.code = legacy.code
        and canon.id is distinct from legacy.id
    $q$;
    execute $q$
      update public.clothing_storage_locations
      set season = public.normalize_season_id(season)
      where season is distinct from public.normalize_season_id(season)
    $q$;
  end if;
end;
$do$;

-- Tables without season uniqueness conflicts (idempotent updates)
update public.matches
set season = public.normalize_season_id(season)
where season is distinct from public.normalize_season_id(season);

update public.videos
set season = public.normalize_season_id(season)
where season is distinct from public.normalize_season_id(season);

update public.payments
set season = public.normalize_season_id(season)
where season is distinct from public.normalize_season_id(season);

do $do$
declare
  t text;
begin
  foreach t in array array[
    'players',
    'teams',
    'season_fee_lines',
    'clothing_products',
    'clothing_supplier_orders'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'update public.%I set season = public.normalize_season_id(season)
         where season is distinct from public.normalize_season_id(season)',
        t
      );
    end if;
  end loop;
end;
$do$;
