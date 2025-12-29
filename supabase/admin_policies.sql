-- Allow Admin to update ALL profiles
-- This is required for the Reset Commission and Update Commission features in Admin Dashboard

CREATE POLICY "Admin All Permissions"
ON profiles
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'facundo.lobos90@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'facundo.lobos90@gmail.com');

-- Also ensure Admin can READ all bookings regardless of RLS (though usually they can)
-- If booking policies are strict, add this:
CREATE POLICY "Admin Read All Bookings"
ON bookings
FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = 'facundo.lobos90@gmail.com');
