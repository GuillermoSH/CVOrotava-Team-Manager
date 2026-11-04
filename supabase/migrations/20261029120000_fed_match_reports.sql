-- Datos extraídos del acta en PDF de cada partido de la Federación (Leverade / Clupik).
-- Una fila por partido (`fed_match_reports`) y tablas hijas con lo que lleva el acta: sets, tiempos
-- muertos, sustituciones, plantillas, cuerpo técnico, árbitros y sanciones.
--
-- Todo va por local/visitante (`home` / `away`), como `fed_matches`, no por las letras A/B del acta:
-- la asignación se hace al guardar, contrastando los puntos de cada set con `fed_match_sets`.
-- Los marcadores de tiempos muertos y sustituciones son «propios:rival» desde el equipo del que se
-- trata (`own_points`, `opp_points`).
--
-- `status`: ok = todo cuadra; review = se ha leído pero el acta trae irregularidades (ver `issues`);
-- failed = no se ha podido leer o no coincide con el partido (no se guardan las tablas hijas).
-- Acceso: solo service_role (sincronizador y lecturas del servidor).

-- ─────────────────────────────────────────────────────────────
-- 1. Partido
-- ─────────────────────────────────────────────────────────────
create table if not exists public.fed_match_reports (
  match_id        bigint primary key references public.fed_matches(id) on delete cascade,
  status          text not null check (status in ('ok', 'review', 'failed')),
  parser_version  int  not null,
  parsed_at       timestamptz not null default now(),
  issues          jsonb not null default '[]'::jsonb,
  -- Qué equipo del acta (A o B) es el local de la federación; null si no se ha podido asignar
  home_side       text check (home_side in ('A', 'B')),
  home_name       text,
  away_name       text,
  start_time      time,
  end_time        time,
  duration_min    smallint,
  venue           text,
  city            text,
  comments        text,
  home_timeouts   smallint,
  away_timeouts   smallint,
  home_subs       smallint,
  away_subs       smallint
);

create index if not exists idx_fed_match_reports_status on public.fed_match_reports (status);

-- ─────────────────────────────────────────────────────────────
-- 2. Sets
-- ─────────────────────────────────────────────────────────────
create table if not exists public.fed_report_sets (
  match_id          bigint not null references public.fed_match_reports(match_id) on delete cascade,
  set_number        smallint not null check (set_number between 1 and 5),
  start_time        time,
  end_time          time,
  duration_min      smallint,
  home_points       smallint not null,
  away_points       smallint not null,
  -- Tiempos muertos y sustituciones tal como los cuenta el cuadro de resultado del acta
  home_timeouts     smallint not null default 0,
  away_timeouts     smallint not null default 0,
  home_subs         smallint not null default 0,
  away_subs         smallint not null default 0,
  -- Dorsales de la alineación inicial por posición (I a VI); 0 = no escrito en el acta; vacío = sin alineación
  home_lineup       smallint[] not null default '{}',
  away_lineup       smallint[] not null default '{}',
  home_serves_first boolean,
  away_serves_first boolean,
  primary key (match_id, set_number)
);

-- ─────────────────────────────────────────────────────────────
-- 3. Tiempos muertos y sustituciones (un evento por fila, para poder agregarlos)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.fed_report_timeouts (
  match_id    bigint not null references public.fed_match_reports(match_id) on delete cascade,
  set_number  smallint not null,
  side        text not null check (side in ('home', 'away')),
  seq         smallint not null,
  own_points  smallint not null,
  opp_points  smallint not null,
  primary key (match_id, set_number, side, seq)
);

create table if not exists public.fed_report_substitutions (
  match_id    bigint not null references public.fed_match_reports(match_id) on delete cascade,
  set_number  smallint not null,
  side        text not null check (side in ('home', 'away')),
  seq         smallint not null,
  -- Posición del campo (1 a 6) y dorsal que entra (null si el acta no lo trae)
  position    smallint not null check (position between 1 and 6),
  player_in   smallint,
  in_own      smallint not null,
  in_opp      smallint not null,
  -- Marcador en que el titular vuelve a su puesto, si lo hace
  back_own    smallint,
  back_opp    smallint,
  primary key (match_id, set_number, side, seq)
);

-- ─────────────────────────────────────────────────────────────
-- 4. Plantillas, cuerpo técnico, árbitros y sanciones
-- ─────────────────────────────────────────────────────────────
create table if not exists public.fed_report_players (
  match_id      bigint not null references public.fed_match_reports(match_id) on delete cascade,
  side          text not null check (side in ('home', 'away')),
  shirt_number  smallint not null,
  name          text not null,
  is_libero     boolean not null default false,
  primary key (match_id, side, shirt_number)
);

create index if not exists idx_fed_report_players_name on public.fed_report_players (name);

create table if not exists public.fed_report_staff (
  match_id  bigint not null references public.fed_match_reports(match_id) on delete cascade,
  side      text not null check (side in ('home', 'away')),
  seq       smallint not null,
  -- Rótulo del acta: E entrenador, A1/A2 auxiliares, etc.
  role      text not null,
  name      text not null,
  primary key (match_id, side, seq)
);

create table if not exists public.fed_report_referees (
  match_id  bigint not null references public.fed_match_reports(match_id) on delete cascade,
  seq       smallint not null,
  role      text not null,
  name      text not null,
  license   text,
  primary key (match_id, seq)
);

create table if not exists public.fed_report_sanctions (
  match_id    bigint not null references public.fed_match_reports(match_id) on delete cascade,
  seq         smallint not null,
  -- W amonestación, P penalización, E expulsión, D descalificación
  kind        text not null check (kind in ('W', 'P', 'E', 'D')),
  -- Dorsal del jugador sancionado o letra del miembro del cuerpo técnico
  offender    text not null,
  side        text check (side in ('home', 'away')),
  set_number  smallint,
  own_points  smallint,
  opp_points  smallint,
  primary key (match_id, seq)
);

-- ─────────────────────────────────────────────────────────────
-- 5. Acceso: solo service_role
-- ─────────────────────────────────────────────────────────────
-- RLS activado y sin ninguna política: un JWT de cliente (anon o authenticated) no puede leer ni
-- escribir nada. Se quitan además los permisos de tabla a esos dos roles y se dan expresamente al
-- service_role, que es el que usan el sincronizador y las lecturas del servidor (y que salta RLS).
-- No hay secuencias: todas las claves vienen de la federación.

alter table public.fed_match_reports enable row level security;
revoke all on public.fed_match_reports from anon, authenticated;
grant select, insert, update, delete on public.fed_match_reports to service_role;

alter table public.fed_report_sets enable row level security;
revoke all on public.fed_report_sets from anon, authenticated;
grant select, insert, update, delete on public.fed_report_sets to service_role;

alter table public.fed_report_timeouts enable row level security;
revoke all on public.fed_report_timeouts from anon, authenticated;
grant select, insert, update, delete on public.fed_report_timeouts to service_role;

alter table public.fed_report_substitutions enable row level security;
revoke all on public.fed_report_substitutions from anon, authenticated;
grant select, insert, update, delete on public.fed_report_substitutions to service_role;

alter table public.fed_report_players enable row level security;
revoke all on public.fed_report_players from anon, authenticated;
grant select, insert, update, delete on public.fed_report_players to service_role;

alter table public.fed_report_staff enable row level security;
revoke all on public.fed_report_staff from anon, authenticated;
grant select, insert, update, delete on public.fed_report_staff to service_role;

alter table public.fed_report_referees enable row level security;
revoke all on public.fed_report_referees from anon, authenticated;
grant select, insert, update, delete on public.fed_report_referees to service_role;

alter table public.fed_report_sanctions enable row level security;
revoke all on public.fed_report_sanctions from anon, authenticated;
grant select, insert, update, delete on public.fed_report_sanctions to service_role;
