-- Fase 2: enlace pabellones federación ↔ venues.
-- `venues.location_type` (casa/fuera/viaje) sigue siendo la fuente de verdad;
-- se elimina la columna duplicada de fed_facilities.

alter table public.venues
  add column if not exists fed_facility_id bigint
    references public.fed_facilities(id) on delete set null;

create unique index if not exists idx_venues_fed_facility_id
  on public.venues (fed_facility_id)
  where fed_facility_id is not null;

alter table public.fed_facilities
  drop column if exists location_type;
