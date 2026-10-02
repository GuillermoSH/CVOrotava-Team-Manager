-- Fix: Portal /admin/jugadores 500 — "permission denied for table allowed_emails"
--
-- Cause: TM migration 20261002141500 added SELECT policies on players/teams that
-- subquery public.allowed_emails. Evaluating those policies as `authenticated`
-- requires GRANT SELECT on allowed_emails; without it Postgres aborts the whole
-- query even when Portal's own has_portal_role policies would allow the row.
--
-- Team Manager already reads players via service_role (bypasses RLS). Portal
-- already has players_select_scoped / teams_select_portal. Drop the allowlist
-- policies that break Portal, and grant SELECT on allowed_emails so any remaining
-- allowlist-based policies (matches/venues) can evaluate safely under RLS.

drop policy if exists "Allowlisted users can read players" on public.players;
drop policy if exists "Allowlisted users can read teams" on public.teams;

-- Own-row RLS already exists ("Users read own allowlist row"). Grant is required
-- for policy subqueries and Auth Hooks-adjacent checks as authenticated.
grant select on public.allowed_emails to authenticated;

notify pgrst, 'reload schema';
