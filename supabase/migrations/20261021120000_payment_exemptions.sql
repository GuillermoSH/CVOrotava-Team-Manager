-- Jugadores exentos de pagos por temporada (p. ej. miembros de la coordinación).
-- Solo se lee y escribe con service role desde Team Manager: RLS activado y sin
-- grants para anon/authenticated.

create table if not exists public.payment_exemptions (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players(id) on delete cascade,
  season      text not null,
  reason      text,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  constraint payment_exemptions_season_format check (season ~ '^[0-9]{4}-[0-9]{2}$'),
  constraint payment_exemptions_player_season_key unique (player_id, season)
);

create index if not exists idx_payment_exemptions_season
  on public.payment_exemptions (season);

alter table public.payment_exemptions enable row level security;
revoke all on public.payment_exemptions from anon, authenticated;
