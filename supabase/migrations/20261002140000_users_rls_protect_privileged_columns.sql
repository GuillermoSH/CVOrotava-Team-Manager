-- Prevent privilege escalation via client JWT on public.users.
-- Old policy allowed any self-row write (including role / is_active) via PostgREST + anon key.
--
-- Idempotent: safe to re-run in SQL Editor if a previous attempt partially applied.

-- ── Split policies: SELECT + UPDATE own row; no INSERT/DELETE for authenticated
drop policy if exists "Each user can view/update their own player row" on public.users;
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_update_own" on public.users;

create policy "users_select_own"
on public.users
for select
to authenticated
using (id = (select auth.uid()));

create policy "users_update_own"
on public.users
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- ── Freeze role / is_active / id for non-service_role sessions
create or replace function public.protect_users_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $function$
begin
  -- PostgREST service role (supabaseAdmin) may change privileged fields.
  if (select auth.role()) = 'service_role' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.role := old.role;
    new.is_active := old.is_active;
  elsif tg_op = 'INSERT' then
    new.role := 'player';
    if new.is_active is null then
      new.is_active := true;
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_protect_users_privileged_columns on public.users;

create trigger trg_protect_users_privileged_columns
before insert or update on public.users
for each row
execute function public.protect_users_privileged_columns();

comment on function public.protect_users_privileged_columns() is
  'Blocks client JWT from changing users.role / users.is_active / users.id; service_role may change them.';
