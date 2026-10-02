-- Club membership activity (leavers keep login + payments read).
alter table public.users
  add column if not exists is_active boolean not null default true;

comment on column public.users.is_active is
  'false = left the club; may still sign in and view own payments.';

-- Existing rows already get default true via NOT NULL DEFAULT.
