-- Índices para listados de pagos (jugador: filtro por user_id vía RLS + orden por due_date; admin: season).
create index if not exists idx_payments_user_due_date
  on public.payments (user_id, due_date nulls last);

create index if not exists idx_payments_season_due_date
  on public.payments (season, due_date nulls last)
  where season is not null;
