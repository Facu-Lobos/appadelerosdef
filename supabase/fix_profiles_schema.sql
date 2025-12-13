-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload config';

-- Ensure description column exists in profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'description') THEN
        ALTER TABLE profiles ADD COLUMN description TEXT;
    END IF;
END $$;

-- Ensure schedule column exists (just in case)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'schedule') THEN
        ALTER TABLE profiles ADD COLUMN schedule JSONB;
    END IF;
END $$;
