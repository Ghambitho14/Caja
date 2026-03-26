-- Depósitos semanales al cerrar semana (Caja)
-- Ejecutar en Supabase SQL editor o vía migraciones si usas Supabase CLI.
-- Nota: nombres de tablas según `src/utils/api.js`: ajustes, ajustes_semana

alter table public.ajustes_semana
add column if not exists deposito_total numeric not null default 0;

alter table public.ajustes_semana
add column if not exists deposito_efectivo numeric not null default 0;

alter table public.ajustes_semana
add column if not exists deposito_tarjeta numeric not null default 0;

alter table public.ajustes_semana
add column if not exists deposito_creado_at timestamptz null;

alter table public.ajustes
add column if not exists migracion_depositos_v1 boolean not null default false;

