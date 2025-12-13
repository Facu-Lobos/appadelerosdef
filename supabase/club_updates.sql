-- Add schedule column to profiles if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS schedule JSONB;

-- Create courts table
CREATE TABLE IF NOT EXISTS courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('crystal', 'wall')),
    surface TEXT CHECK (surface IN ('synthetic', 'cement')),
    is_indoor BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies for courts
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

-- Everyone can view courts
CREATE POLICY "Courts are viewable by everyone" 
ON courts FOR SELECT 
USING (true);

-- Clubs can manage their own courts
CREATE POLICY "Clubs can insert their own courts" 
ON courts FOR INSERT 
WITH CHECK (auth.uid() = club_id);

CREATE POLICY "Clubs can update their own courts" 
ON courts FOR UPDATE 
USING (auth.uid() = club_id);

CREATE POLICY "Clubs can delete their own courts" 
ON courts FOR DELETE 
USING (auth.uid() = club_id);
