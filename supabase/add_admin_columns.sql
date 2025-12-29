-- Add missing columns for Admin features
-- It seems these columns were used in the code but never added to the database

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0.05;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_payment_date timestamptz;

-- Refresh schema cache advice:
-- After running this, go to Supabase -> Settings -> API -> Reload Schema Cache (if accessible)
-- Or simpler: reloading the React app often forces a refresh of the client's knowledge if it's dynamic, 
-- but 'schema cache' error usually refers to the Supabase PostgREST server cache, which Supabase UI 
-- has a button for, or it auto-refreshes after DDL changes.
