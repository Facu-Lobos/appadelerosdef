-- Allow clubs to update bookings (e.g. mark as paid)
CREATE POLICY "Clubs can update bookings for their courts"
ON public.bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.courts
    WHERE courts.id = bookings.court_id
    AND courts.club_id = auth.uid()
  )
);

-- Reload schema cache
NOTIFY pgrst, 'reload config';
