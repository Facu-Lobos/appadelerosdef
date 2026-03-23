-- Ejecutar esto en el SQL Editor de Supabase (Dashboard -> SQL Editor -> New query)

-- 1. Agregar las nuevas columnas a la tabla tournaments
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS format text DEFAULT 'knockout',
ADD COLUMN IF NOT EXISTS zones_count integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS teams_advancing_per_zone integer DEFAULT 2;

-- 2. Asegurarse de que el RLS permita el acceso a estas columnas, no se necesitan cambios si el RLS ya estaba sobre la tabla entera.

-- Nota: format puede ser 'knockout', 'league', o 'americano'
