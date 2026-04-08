-- Temporadas distintas sin transferir todas las filas de videos al backend (query-* / data-*).
-- Ejecutar en Supabase SQL Editor o con: supabase db push

create or replace function public.list_distinct_video_seasons()
returns table (season text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct v.season::text
  from public.videos v
  where v.season is not null and btrim(v.season) <> ''
  order by 1 desc;
$$;

comment on function public.list_distinct_video_seasons() is
  'Lista ordenada de temporadas únicas; evita SELECT masivo + deduplicación en la app.';

revoke all on function public.list_distinct_video_seasons() from public;
grant execute on function public.list_distinct_video_seasons() to service_role;

-- Lecturas frecuentes: partidos por temporada / género / fecha
create index if not exists idx_matches_season_gender_date
  on public.matches (season, gender, date desc);

-- DISTINCT / filtros por temporada en videos
create index if not exists idx_videos_season
  on public.videos (season)
  where season is not null;
