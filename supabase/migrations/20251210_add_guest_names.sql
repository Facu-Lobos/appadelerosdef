-- Add guest name columns to tournament_registrations
-- This allows clubs to register players manually by name without them having a profile

ALTER TABLE public.tournament_registrations 
ADD COLUMN IF NOT EXISTS player1_name text,
ADD COLUMN IF NOT EXISTS player2_name text;
