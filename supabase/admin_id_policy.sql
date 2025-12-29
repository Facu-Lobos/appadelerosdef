-- Admin Policy by User ID (More robust than email)
-- User ID from logs: 4da0ad84-6760-4e4e-9942-9fe91cae6538

-- 1. Drop previous policies to avoid conflicts
DROP POLICY IF EXISTS "Admin All Permissions" ON profiles;
DROP POLICY IF EXISTS "Admin All Permissions ID" ON profiles;

-- 2. Create policy using ID
CREATE POLICY "Admin All Permissions ID"
ON profiles
FOR ALL
TO authenticated
USING (auth.uid() = '4da0ad84-6760-4e4e-9942-9fe91cae6538')
WITH CHECK (auth.uid() = '4da0ad84-6760-4e4e-9942-9fe91cae6538');

-- 3. Grant usage on standard tables just in case
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON clubs TO authenticated;
