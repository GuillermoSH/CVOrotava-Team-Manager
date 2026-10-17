-- Higiene del esquema (auditoría 2026-10-17): índices redundantes, formato de
-- temporada garantizado y una política que apuntaba a {public}.
-- Solo toca tablas de Team Manager (matches, payments, videos) salvo la política
-- de players, que solo cambia de rol (anon no tiene grants en ninguna tabla).

-- ── 1. Índices redundantes (cada uno lo cubre otro con el mismo prefijo) ──────
-- payments(user_id)            → cubierto por idx_payments_user_due_date (user_id, due_date)
-- payments(player_id) parcial  → cubierto por payments_player_season_idx (player_id, season)
-- players(user_id)             → cubierto por players_user_id_unique_idx (user_id) where not null
-- videos(match_id) parcial     → idéntico a idx_videos_one_per_match
drop index if exists public.idx_payments_user_id;
drop index if exists public.payments_player_id_idx;
drop index if exists public.players_user_id_idx;
drop index if exists public.idx_videos_match_id;

-- ── 2. Formato de temporada YYYY-YY garantizado en escrituras nuevas ──────────
-- NOT VALID: no bloquea por filas antiguas; se valida justo después si todo cuadra.
alter table public.matches
  drop constraint if exists matches_season_format_chk,
  add constraint matches_season_format_chk
    check (season ~ '^\d{4}-\d{2}$') not valid;

alter table public.payments
  drop constraint if exists payments_season_format_chk,
  add constraint payments_season_format_chk
    check (season is null or season ~ '^\d{4}-\d{2}$') not valid;

alter table public.videos
  drop constraint if exists videos_season_format_chk,
  add constraint videos_season_format_chk
    check (season is null or season ~ '^\d{4}-\d{2}$') not valid;

do $do$
declare
  t text;
begin
  foreach t in array array['matches', 'payments', 'videos']
  loop
    begin
      execute format('alter table public.%I validate constraint %I', t, t || '_season_format_chk');
    exception when check_violation then
      raise notice 'public.% tiene temporadas fuera de YYYY-YY: la restricción queda NOT VALID. Revisa: select distinct season from public.% where season !~ ''^\d{4}-\d{2}$'';', t, t;
    end;
  end loop;
end;
$do$;

-- ── 3. players_delete_admin aplicaba a {public}; debe ser solo authenticated ──
drop policy if exists players_delete_admin on public.players;
create policy players_delete_admin
on public.players
for delete
to authenticated
using ((select public.has_portal_role(array['admin'::text])));

notify pgrst, 'reload schema';
