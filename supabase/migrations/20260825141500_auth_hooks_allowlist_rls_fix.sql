-- Fix: supabase_auth_admin must BYPASS RLS on allowed_emails.
-- GRANT SELECT alone is not enough when RLS is enabled — without a policy
-- the hook sees zero rows and rejects every login (including allowlisted).

grant usage on schema public to supabase_auth_admin;
grant select on table public.allowed_emails to supabase_auth_admin;

drop policy if exists "Auth admin read allowlist for hooks" on public.allowed_emails;
create policy "Auth admin read allowlist for hooks"
on public.allowed_emails
as permissive
for select
to supabase_auth_admin
using (true);

-- Re-create hooks with correct success payloads + same allowlist logic.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  email_claim text;
  is_allowed boolean;
begin
  email_claim := lower(trim(coalesce(event->'claims'->>'email', '')));

  if email_claim = '' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Tu cuenta no tiene un correo asociado.'
      )
    );
  end if;

  select exists (
    select 1
    from public.allowed_emails ae
    where lower(trim(ae.email)) = email_claim
  ) into is_allowed;

  if not coalesce(is_allowed, false) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Tu correo no está autorizado para acceder a esta aplicación.'
      )
    );
  end if;

  -- Auth expects { "claims": ... } on success
  return jsonb_build_object('claims', event->'claims');
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

create or replace function public.before_user_created_hook(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  email_claim text;
  is_allowed boolean;
begin
  email_claim := lower(trim(coalesce(event->'user'->>'email', '')));

  if email_claim = '' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Tu cuenta no tiene un correo asociado.'
      )
    );
  end if;

  select exists (
    select 1
    from public.allowed_emails ae
    where lower(trim(ae.email)) = email_claim
  ) into is_allowed;

  if not coalesce(is_allowed, false) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Tu correo no está autorizado para acceder a esta aplicación.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute on function public.before_user_created_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.before_user_created_hook(jsonb) from authenticated, anon, public;
