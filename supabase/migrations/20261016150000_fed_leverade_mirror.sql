-- Espejo de datos de la Federación Canaria de Voleibol (plataforma Leverade).
-- Solo Liga Canaria Sénior (masc./fem.) y fases finales donde participa el club.
-- IDs = IDs de Leverade (bigint), para upserts idempotentes en cada sincronización.
--
-- Acceso: solo service_role (sincronizador y lecturas server-side con supabaseAdmin).
-- RLS activado sin policies + revoke → un JWT de cliente no puede leer ni escribir.

-- ─────────────────────────────────────────────────────────────
-- 1. Torneos
-- ─────────────────────────────────────────────────────────────
create table if not exists public.fed_tournaments (
  id          bigint primary key,
  name        text not null,
  season      text not null,                 -- canónico YYYY-YY
  gender      text not null check (gender in ('male', 'female', 'mixed')),
  status      text not null,                 -- in_progress | finished | ...
  synced_at   timestamptz not null default now()
);

create index if not exists idx_fed_tournaments_season
  on public.fed_tournaments (season);

-- ─────────────────────────────────────────────────────────────
-- 2. Grupos (Grupo Tenerife, Fase final, ...)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.fed_groups (
  id             bigint primary key,
  tournament_id  bigint not null references public.fed_tournaments(id) on delete cascade,
  name           text not null,
  type           text,                       -- league | playoff | ...
  sort_order     int,
  -- Torneos "mixed" mezclan grupos masc./fem.: el género real va por grupo.
  gender         text check (gender in ('male', 'female')),
  synced_at      timestamptz not null default now()
);

create index if not exists idx_fed_groups_tournament_id
  on public.fed_groups (tournament_id);

-- ─────────────────────────────────────────────────────────────
-- 3. Jornadas
-- ─────────────────────────────────────────────────────────────
create table if not exists public.fed_rounds (
  id          bigint primary key,
  group_id    bigint not null references public.fed_groups(id) on delete cascade,
  name        text not null,
  sort_order  int,
  synced_at   timestamptz not null default now()
);

create index if not exists idx_fed_rounds_group_id
  on public.fed_rounds (group_id);

-- ─────────────────────────────────────────────────────────────
-- 4. Equipos (Leverade crea un equipo por torneo)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.fed_teams (
  id             bigint primary key,
  tournament_id  bigint not null references public.fed_tournaments(id) on delete cascade,
  name           text not null,
  is_our_club    boolean not null default false,
  synced_at      timestamptz not null default now()
);

create index if not exists idx_fed_teams_tournament_id
  on public.fed_teams (tournament_id);

create index if not exists idx_fed_teams_our_club
  on public.fed_teams (tournament_id)
  where is_our_club;

-- ─────────────────────────────────────────────────────────────
-- 5. Pabellones
-- ─────────────────────────────────────────────────────────────
create table if not exists public.fed_facilities (
  id             bigint primary key,
  name           text not null,
  -- Asignado a mano (la API no lo trae). null = sin clasificar.
  location_type  text check (location_type in ('home', 'away', 'outside_island')),
  synced_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 6. Partidos
-- ─────────────────────────────────────────────────────────────
create table if not exists public.fed_matches (
  id                  bigint primary key,
  tournament_id       bigint not null references public.fed_tournaments(id) on delete cascade,
  group_id            bigint not null references public.fed_groups(id) on delete cascade,
  round_id            bigint references public.fed_rounds(id) on delete set null,
  home_team_id        bigint references public.fed_teams(id) on delete set null,
  away_team_id        bigint references public.fed_teams(id) on delete set null,
  facility_id         bigint references public.fed_facilities(id) on delete set null,
  -- Hora de pared tal cual la publica Leverade, en `timezone`.
  local_date          date,
  local_time          time,
  timezone            text not null default 'Atlantic/Canary',
  finished            boolean not null default false,
  canceled            boolean not null default false,
  postponed           boolean not null default false,
  rest                boolean not null default false,
  home_sets           smallint check (home_sets >= 0),
  away_sets           smallint check (away_sets >= 0),
  home_league_points  smallint,
  away_league_points  smallint,
  report_url          text,                  -- acta PDF (redirect firmado)
  fed_updated_at      timestamptz,
  synced_at           timestamptz not null default now()
);

create index if not exists idx_fed_matches_tournament_id on public.fed_matches (tournament_id);
create index if not exists idx_fed_matches_group_date   on public.fed_matches (group_id, local_date);
create index if not exists idx_fed_matches_round_id     on public.fed_matches (round_id);
create index if not exists idx_fed_matches_home_team_id on public.fed_matches (home_team_id);
create index if not exists idx_fed_matches_away_team_id on public.fed_matches (away_team_id);
create index if not exists idx_fed_matches_facility_id  on public.fed_matches (facility_id);

-- ─────────────────────────────────────────────────────────────
-- 7. Sets (puntos por set)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.fed_match_sets (
  match_id     bigint not null references public.fed_matches(id) on delete cascade,
  set_number   smallint not null check (set_number between 1 and 5),
  home_points  smallint not null check (home_points >= 0),
  away_points  smallint not null check (away_points >= 0),
  primary key (match_id, set_number)
);

-- ─────────────────────────────────────────────────────────────
-- 8. Registro de sincronizaciones ("Actualizado el lunes 08:00")
-- ─────────────────────────────────────────────────────────────
create table if not exists public.fed_sync_runs (
  id           bigint generated always as identity primary key,
  trigger      text not null check (trigger in ('cron', 'manual', 'backfill')),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  ok           boolean,
  summary      jsonb,
  error        text
);

create index if not exists idx_fed_sync_runs_ok_finished
  on public.fed_sync_runs (finished_at desc)
  where ok;

-- ─────────────────────────────────────────────────────────────
-- 9. Enlace con nuestros partidos (se rellena en la fase 2)
-- ─────────────────────────────────────────────────────────────
alter table public.matches
  add column if not exists fed_match_id bigint
    references public.fed_matches(id) on delete set null;

create unique index if not exists idx_matches_fed_match_id
  on public.matches (fed_match_id)
  where fed_match_id is not null;

-- ─────────────────────────────────────────────────────────────
-- 10. Acceso: solo service_role
-- ─────────────────────────────────────────────────────────────
do $do$
declare
  t text;
begin
  foreach t in array array[
    'fed_tournaments', 'fed_groups', 'fed_rounds', 'fed_teams',
    'fed_facilities', 'fed_matches', 'fed_match_sets', 'fed_sync_runs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$do$;
