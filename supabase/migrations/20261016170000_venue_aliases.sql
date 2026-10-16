-- Alias de pabellones: la federación tiene varios IDs para el mismo sitio
-- ("PABELLÓN QUIQUIRÁ", "Pabellón Quiquirá La Orotava", "Pab. Miguel A. Díaz Molina 2"...).
-- Varios pabellones federados → un venue nuestro. Sustituye a venues.fed_facility_id (1:1).

create table if not exists public.venue_fed_facilities (
  fed_facility_id  bigint primary key references public.fed_facilities(id) on delete cascade,
  venue_id         uuid not null references public.venues(id) on delete cascade,
  created_at       timestamptz not null default now()
);

create index if not exists idx_venue_fed_facilities_venue_id
  on public.venue_fed_facilities (venue_id);

alter table public.venue_fed_facilities enable row level security;
revoke all on public.venue_fed_facilities from anon, authenticated;

-- Pabellones dados de alta por la sincronización: casa/fuera/viaje sin confirmar.
alter table public.venues
  add column if not exists needs_review boolean not null default false;

do $do$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'venues' and column_name = 'fed_facility_id'
  ) then
    insert into public.venue_fed_facilities (fed_facility_id, venue_id)
    select fed_facility_id, id from public.venues where fed_facility_id is not null
    on conflict (fed_facility_id) do nothing;

    -- Los creados por el backfill del 2026-10-16 no los ha revisado nadie.
    update public.venues
    set needs_review = true
    where fed_facility_id is not null
      and created_at >= '2026-10-16';

    drop index if exists public.idx_venues_fed_facility_id;
    alter table public.venues drop column fed_facility_id;
  end if;
end;
$do$;

-- Fusión atómica: mueve partidos y alias de `source` a `target` y borra `source`.
create or replace function public.merge_venues(source uuid, target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if source = target then
    raise exception 'source and target must differ';
  end if;
  if not exists (select 1 from public.venues where id = target) then
    raise exception 'target venue % not found', target;
  end if;

  update public.matches set venue_id = target where venue_id = source;
  update public.venue_fed_facilities set venue_id = target where venue_id = source;
  delete from public.venues where id = source;
end;
$$;

revoke all on function public.merge_venues(uuid, uuid) from public, anon, authenticated;
grant execute on function public.merge_venues(uuid, uuid) to service_role;
