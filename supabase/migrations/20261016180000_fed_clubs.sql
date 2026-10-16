-- Club de la federación (ID estable entre temporadas) para unir equipos y pabellones
-- a lo largo del tiempo: "Dihova-Arinaga" → "Dos 19 Arinaga" son el mismo club.
-- Leverade crea un `team` por torneo; el `club` es lo que se mantiene.

create table if not exists public.fed_clubs (
  id           bigint primary key,
  name         text not null,        -- nombre más reciente
  last_season  text not null,        -- temporada (YYYY-YY) de ese nombre
  synced_at    timestamptz not null default now()
);

alter table public.fed_teams
  add column if not exists club_id bigint references public.fed_clubs(id) on delete set null;

create index if not exists idx_fed_teams_club_id
  on public.fed_teams (club_id)
  where club_id is not null;

alter table public.fed_clubs enable row level security;
revoke all on public.fed_clubs from anon, authenticated;
