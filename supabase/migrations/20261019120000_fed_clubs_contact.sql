-- Contacto público de cada club (Leverade expone email, teléfono y sede en `clubs/{id}`).
-- Se rellena en la sincronización semanal; las filas siguen cerradas a anon/authenticated
-- (RLS activado y revoke en 20261016180000_fed_clubs.sql), solo se leen con service role.

alter table public.fed_clubs
  add column if not exists phone              text,
  add column if not exists email              text,
  add column if not exists headquarter        text,
  add column if not exists contact_synced_at  timestamptz;
