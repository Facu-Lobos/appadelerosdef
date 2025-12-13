-- Add hourly_rate column to courts table
ALTER TABLE public.courts 
ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0;

-- Reload schema cache
NOTIFY pgrst, 'reload config';
