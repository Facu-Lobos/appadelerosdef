-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reload PostgREST schema cache (forces Supabase to recognize new columns)
NOTIFY pgrst, 'reload config';

-- Ensure courts table exists with all columns
CREATE TABLE IF NOT EXISTS courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('crystal', 'wall')),
    surface TEXT CHECK (surface IN ('synthetic', 'cement')),
    is_indoor BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- If table exists but columns are missing, add them safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courts' AND column_name = 'type') THEN
        ALTER TABLE courts ADD COLUMN type TEXT CHECK (type IN ('crystal', 'wall'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courts' AND column_name = 'surface') THEN
        ALTER TABLE courts ADD COLUMN surface TEXT CHECK (surface IN ('synthetic', 'cement'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courts' AND column_name = 'is_indoor') THEN
        ALTER TABLE courts ADD COLUMN is_indoor BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Re-apply RLS policies just in case
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Courts are viewable by everyone" ON courts;
CREATE POLICY "Courts are viewable by everyone" ON courts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Clubs can insert their own courts" ON courts;
CREATE POLICY "Clubs can insert their own courts" ON courts FOR INSERT WITH CHECK (auth.uid() = club_id);

DROP POLICY IF EXISTS "Clubs can update their own courts" ON courts;
CREATE POLICY "Clubs can update their own courts" ON courts FOR UPDATE USING (auth.uid() = club_id);

DROP POLICY IF EXISTS "Clubs can delete their own courts" ON courts;
CREATE POLICY "Clubs can delete their own courts" ON courts FOR DELETE USING (auth.uid() = club_id);
