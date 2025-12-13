-- Add columns for Group Stage and Advanced Stats

-- Update Tournament Registrations
ALTER TABLE public.tournament_registrations 
ADD COLUMN IF NOT EXISTS group_name text, -- 'A', 'B', etc.
ADD COLUMN IF NOT EXISTS stats jsonb default '{"points": 0, "played": 0, "won": 0, "lost": 0, "sets_won": 0, "sets_lost": 0, "games_won": 0, "games_lost": 0}'::jsonb;

-- Update Tournament Matches
ALTER TABLE public.tournament_matches 
ADD COLUMN IF NOT EXISTS group_name text,
ADD COLUMN IF NOT EXISTS stage text default 'group', -- 'group', 'quarter', 'semi', 'final'
ADD COLUMN IF NOT EXISTS sets_score jsonb; -- Detailed score e.g. [{w:6, l:4}, {w:6, l:2}]

-- Function to calculate standings trigger (Optional but recommended for consistency)
-- For now, we will handle calculation in the application layer to keep SQL simple, 
-- but having the columns is the first step.
