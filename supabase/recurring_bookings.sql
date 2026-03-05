-- Añadir columna para agrupar reservas fijas
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS recurring_series_id UUID;

-- Crear un índice para búsquedas por serie (útil para "borrar todo el turno fijo")
CREATE INDEX IF NOT EXISTS idx_bookings_recurring_series_id ON public.bookings(recurring_series_id);
