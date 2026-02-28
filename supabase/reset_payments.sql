-- Reset payments for "Cancha Demo" for Feb 10th and 11th, 2026
-- Timezone: Argentina (UTC-3)

UPDATE public.bookings
SET payment_status = 'unpaid'
WHERE court_id IN (
    SELECT id 
    FROM public.courts 
    WHERE name ILIKE '%cancha demo%'
)
AND start_time >= '2026-02-10 00:00:00-03'
AND start_time < '2026-02-12 00:00:00-03';
