-- League standings (snapshot por temporada + género) + team_aliases (mapeo global de nombres rivales).
-- Permisos: lectura allowlisted, escritura solo users.role = 'admin'.

-- ─────────────────────────────────────────────────────────────
-- 1. league_standings
-- ─────────────────────────────────────────────────────────────
create table if not exists public.league_standings (
  id                uuid primary key default gen_random_uuid(),
  season            text not null,
  gender            text not null check (gender in ('male', 'female')),
  position          int  not null,
  team_name         text not null,
  normalized_name   text not null,
  is_our_team       boolean not null default false,
  played            int  not null default 0,
  won               int  not null default 0,
  lost              int  not null default 0,
  sets_for          int  not null default 0,
  sets_against      int  not null default 0,
  points_for        int,
  points_against    int,
  league_points     int  not null default 0,
  uploaded_by       uuid references public.users(id) on delete set null,
  uploaded_at       timestamptz not null default now(),
  unique (season, gender, normalized_name)
);

create index if not exists idx_league_standings_season_gender
  on public.league_standings (season, gender, position);

alter table public.league_standings enable row level security;

drop policy if exists "league_standings_select_allowlisted" on public.league_standings;
create policy "league_standings_select_allowlisted"
on public.league_standings
for select
to authenticated
using (
  exists (
    select 1
    from public.allowed_emails ae
    where ae.email = ((select auth.jwt()) ->> 'email'::text)
  )
);

drop policy if exists "league_standings_insert_admin" on public.league_standings;
create policy "league_standings_insert_admin"
on public.league_standings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'::text
  )
);

drop policy if exists "league_standings_update_admin" on public.league_standings;
create policy "league_standings_update_admin"
on public.league_standings
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'::text
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'::text
  )
);

drop policy if exists "league_standings_delete_admin" on public.league_standings;
create policy "league_standings_delete_admin"
on public.league_standings
for delete
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'::text
  )
);

-- ─────────────────────────────────────────────────────────────
-- 2. team_aliases
-- ─────────────────────────────────────────────────────────────
create table if not exists public.team_aliases (
  id                    uuid primary key default gen_random_uuid(),
  alias_normalized      text not null,
  canonical_normalized  text not null,
  display_alias         text,
  display_canonical     text,
  created_by            uuid references public.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  unique (alias_normalized),
  check (alias_normalized <> canonical_normalized)
);

create index if not exists idx_team_aliases_canonical
  on public.team_aliases (canonical_normalized);

alter table public.team_aliases enable row level security;

drop policy if exists "team_aliases_select_allowlisted" on public.team_aliases;
create policy "team_aliases_select_allowlisted"
on public.team_aliases
for select
to authenticated
using (
  exists (
    select 1
    from public.allowed_emails ae
    where ae.email = ((select auth.jwt()) ->> 'email'::text)
  )
);

drop policy if exists "team_aliases_insert_admin" on public.team_aliases;
create policy "team_aliases_insert_admin"
on public.team_aliases
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'::text
  )
);

drop policy if exists "team_aliases_update_admin" on public.team_aliases;
create policy "team_aliases_update_admin"
on public.team_aliases
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'::text
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'::text
  )
);

drop policy if exists "team_aliases_delete_admin" on public.team_aliases;
create policy "team_aliases_delete_admin"
on public.team_aliases
for delete
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'::text
  )
);
