-- Allow players to cancel (update status) of their own bookings
DROP POLICY IF EXISTS "Players can cancel their own bookings" ON public.bookings;
CREATE POLICY "Players can cancel their own bookings"
ON public.bookings
FOR UPDATE
USING (
  auth.uid() = player_id
)
WITH CHECK (
  auth.uid() = player_id
);

-- Allow clubs to cancel (update status) of bookings on their courts
DROP POLICY IF EXISTS "Clubs can update bookings on their courts" ON public.bookings;
CREATE POLICY "Clubs can update bookings on their courts"
ON public.bookings
FOR UPDATE
USING (
  exists (
    select 1 from public.courts
    where courts.id = bookings.court_id
    and courts.club_id = auth.uid()
  )
)
WITH CHECK (
  exists (
    select 1 from public.courts
    where courts.id = bookings.court_id
    and courts.club_id = auth.uid()
  )
);
