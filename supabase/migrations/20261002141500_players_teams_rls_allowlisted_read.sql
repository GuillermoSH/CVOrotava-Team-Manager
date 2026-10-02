-- Defense in depth for Portal roster tables used by payments.
-- App reads/writes players via service role only; without RLS a leaked JWT
-- could still hit PostgREST. Enable RLS: allowlisted SELECT, no client writes.
--
-- If `players` / `teams` do not exist in a given environment, wrap or skip.

do $do$
begin
  if to_regclass('public.players') is null then
    raise notice 'public.players missing — skip players RLS';
    return;
  end if;

  alter table public.players enable row level security;

  -- Drop legacy/unknown permissive policies if present (names may vary).
  -- Safe no-ops when missing.
  begin
    execute 'drop policy if exists "Enable read access for all users" on public.players';
    execute 'drop policy if exists "Enable insert for authenticated users only" on public.players';
    execute 'drop policy if exists "Enable update for authenticated users only" on public.players';
    execute 'drop policy if exists "Enable delete for authenticated users only" on public.players';
  exception when others then
    null;
  end;

  drop policy if exists "Allowlisted users can read players" on public.players;

  create policy "Allowlisted users can read players"
  on public.players
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.allowed_emails ae
      where ae.email = ((select auth.jwt()) ->> 'email'::text)
    )
  );
  -- No INSERT/UPDATE/DELETE policies for authenticated → deny.
  -- service_role bypasses RLS (supabaseAdmin / Portal sync).
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

  create policy "Allowlisted users can read teams"
  on public.teams
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.allowed_emails ae
      where ae.email = ((select auth.jwt()) ->> 'email'::text)
    )
  );
end;
$do$;
