-- Allow players to cancel (update status) of their own bookings
CREATE POLICY "Players can cancel their own bookings"
ON public.bookings
FOR UPDATE
USING (
  auth.uid() = player_id
)
WITH CHECK (
  auth.uid() = player_id
);
