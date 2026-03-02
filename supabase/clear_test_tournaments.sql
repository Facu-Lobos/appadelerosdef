-- Clean Torneos y Ranking de Prueba (Ejemplos Genéricos)
-- ALERTA: Esto borrará TODOS los torneos actuales de la plataforma.

DELETE FROM public.tournaments;
DELETE FROM public.ranking_points;

-- Nota: Como ya configuramos ON DELETE CASCADE, al borrar un torneo 
-- se borrarán automáticamente sus tournament_registrations y tournament_matches.
