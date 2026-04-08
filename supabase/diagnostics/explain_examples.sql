-- Plantillas para revisar planes en Supabase: SQL Editor o Database → Query Performance.
-- Sustituye literales por valores reales. En producción, empieza con EXPLAIN (sin ANALYZE) si prefieres no ejecutar la consulta.

-- Listado de partidos (misma idea que /api/matches con temporada y género)
-- explain (analyze, buffers, format text)
-- select m.id, m.date, m.time, m.opponent, m.season, m.gender, m.result
-- from public.matches m
-- where m.season = '2025/2026' and m.gender = 'male'
-- order by m.date asc, m.time asc;

-- Pagos por usuario y fecha (jugador autenticado; el plan real con RLS puede variar)
-- explain (analyze, buffers, format text)
-- select id, user_id, concept, amount, status, due_date, paid_date, notes, season, created_at, updated_at
-- from public.payments
-- where user_id = '00000000-0000-0000-0000-000000000000'::uuid
--   and season = '2025/2026'
-- order by due_date asc nulls last;

-- Videos paginados (orden por created_at)
-- explain (analyze, buffers, format text)
-- select id, url, created_at, category, season, competition_type, gender
-- from public.videos
-- where season = '2025/2026'
-- order by created_at desc
-- limit 12 offset 0;
