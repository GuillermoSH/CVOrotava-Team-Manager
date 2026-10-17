-- Unify season labels to Portal format YYYY-YY (e.g. 2026-27).
-- Converts legacy Team Manager slash form YYYY/YY in shared tables.
-- Also trims whitespace / CRLF leftovers from spreadsheet imports.

update public.matches
set season = replace(btrim(season), '/', '-')
where season like '%/%' or season <> btrim(season);

update public.videos
set season = replace(btrim(season), '/', '-')
where season like '%/%' or season <> btrim(season);

update public.payments
set season = replace(btrim(regexp_replace(season, E'[\\r\\n]+', '', 'g')), '/', '-')
where season like '%/%'
   or season <> btrim(season)
   or season ~ E'[\\r\\n]';

update public.league_standings
set season = replace(btrim(season), '/', '-')
where season like '%/%' or season <> btrim(season);

do $do$
begin
  if to_regclass('public.players') is not null then
    execute $q$
      update public.players
      set season = replace(btrim(season), '/', '-')
      where season like '%/%' or season <> btrim(season)
    $q$;
  end if;
  if to_regclass('public.teams') is not null then
    execute $q$
      update public.teams
      set season = replace(btrim(season), '/', '-')
      where season like '%/%' or season <> btrim(season)
    $q$;
  end if;
end;
$do$;
