-- Marcador jugada a jugada de cada set, reconstruido de las rondas de saque del acta.
-- Formato: «L:LLVL…»: primero quién saca (L local, V visitante), luego quién gana cada jugada, en orden.
-- null = las rondas de saque de los dos equipos no encajan con el resultado del set (acta mal rellenada,
-- set otorgado…); en ese caso el set se guarda solo con sus puntos.
-- Es una columna nueva de una tabla que ya es solo del service_role: no cambia ningún permiso ni política.

alter table public.fed_report_sets
  add column if not exists rallies text;

alter table public.fed_report_sets
  drop constraint if exists fed_report_sets_rallies_format;
alter table public.fed_report_sets
  add constraint fed_report_sets_rallies_format check (rallies is null or rallies ~ '^[LV]:[LV]+$');
