-- Blindaje RLS + políticas eficientes (auth.* entre paréntesis con SELECT).
-- Índice FK matches.venue_id. Trigger update_match_result con search_path fijo.

-- ── allowed_emails: solo fila propia (antes: cualquier auth veía todos los emails)
drop policy if exists "Authenticated users can read allowed_emails" on public.allowed_emails;

create policy "Users read own allowlist row"
on public.allowed_emails
for select
to authenticated
using (email = ((select auth.jwt()) ->> 'email'::text));

-- ── matches / venues: solo usuarios autenticados en lista allowlist (evita lectura masiva anónima/cuentas fuera de lista)
drop policy if exists "Allow read access to all matches" on public.matches;

create policy "Allowlisted users can read matches"
on public.matches
for select
to authenticated
using (
  exists (
    select 1
    from public.allowed_emails ae
    where ae.email = ((select auth.jwt()) ->> 'email'::text)
  )
);

drop policy if exists "Allow read access to all venues" on public.venues;

create policy "Allowlisted users can read venues"
on public.venues
for select
to authenticated
using (
  exists (
    select 1
    from public.allowed_emails ae
    where ae.email = ((select auth.jwt()) ->> 'email'::text)
  )
);

-- ── users: misma regla, initplan corregido
drop policy if exists "Each user can view/update their own player row" on public.users;

create policy "Each user can view/update their own player row"
on public.users
for all
to public
using (((select auth.uid()) = id))
with check (((select auth.uid()) = id));

-- ── payments: una sola política SELECT (evita múltiples políticas permisivas) + escritura solo admin
drop policy if exists "Admins have full access to payments" on public.payments;
drop policy if exists "Players can view their own payments" on public.payments;

create policy "payments_select_allowlisted"
on public.payments
for select
to authenticated
using (
  (user_id = (select auth.uid()))
  or exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'::text
  )
);

create policy "payments_insert_admin"
on public.payments
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

create policy "payments_update_admin"
on public.payments
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

create policy "payments_delete_admin"
on public.payments
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

-- ── videos / match_sets: RLS activo sin políticas → denegaba todo vía cliente; alineamos con allowlist solo lectura
create policy "Allowlisted users can read videos"
on public.videos
for select
to authenticated
using (
  exists (
    select 1
    from public.allowed_emails ae
    where ae.email = ((select auth.jwt()) ->> 'email'::text)
  )
);

create policy "Allowlisted users can read match_sets"
on public.match_sets
for select
to authenticated
using (
  exists (
    select 1
    from public.allowed_emails ae
    where ae.email = ((select auth.jwt()) ->> 'email'::text)
  )
);

-- ── Rendimiento: FK sin índice (advisor)
create index if not exists idx_matches_venue_id
  on public.matches (venue_id);

-- ── Función trigger: search_path fijo (advisor security)
create or replace function public.update_match_result()
returns trigger
language plpgsql
security invoker
set search_path = public
as $function$
declare
  sets_our_team int;
  sets_opponent int;
begin
  select
    count(*) filter (where team_score > opponent_score),
    count(*) filter (where team_score < opponent_score)
  into sets_our_team, sets_opponent
  from public.match_sets
  where match_id = new.match_id;

  update public.matches
  set result = sets_our_team::text || '-' || sets_opponent::text
  where id = new.match_id;

  return new;
end;
$function$;
