-- Defense in depth for Portal roster tables used by payments.
--
-- IMPORTANT: Do NOT add SELECT policies that subquery public.allowed_emails
-- for `authenticated` unless that role has GRANT SELECT on allowed_emails.
-- Otherwise Portal (/admin/jugadores, /admin/pagos) fails with
-- "permission denied for table allowed_emails" when Postgres evaluates the
-- policy expression — even if Portal's has_portal_role policies would allow.
--
-- Team Manager reads/writes players via service_role (bypasses RLS).
-- Portal already defines players_select_scoped / teams_select_portal.
-- This migration only enables RLS if needed and leaves Portal policies intact.

do $do$
begin
  if to_regclass('public.players') is null then
    raise notice 'public.players missing — skip players RLS';
    return;
  end if;

  alter table public.players enable row level security;

  begin
    execute 'drop policy if exists "Enable read access for all users" on public.players';
    execute 'drop policy if exists "Enable insert for authenticated users only" on public.players';
    execute 'drop policy if exists "Enable update for authenticated users only" on public.players';
    execute 'drop policy if exists "Enable delete for authenticated users only" on public.players';
  exception when others then
    null;
  end;

  -- Remove broken allowlist policy if a previous version of this file created it.
  drop policy if exists "Allowlisted users can read players" on public.players;
end;
$do$;

do $do$
begin
  if to_regclass('public.teams') is null then
    raise notice 'public.teams missing — skip teams RLS';
    return;
  end if;

  alter table public.teams enable row level security;

  drop policy if exists "Allowlisted users can read teams" on public.teams;
end;
$do$;

grant select on public.allowed_emails to authenticated;
