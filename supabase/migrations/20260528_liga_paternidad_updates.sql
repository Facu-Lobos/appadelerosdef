-- Add is_active column to tournament_registrations to support freezing players
ALTER TABLE public.tournament_registrations
ADD COLUMN IF NOT EXISTS is_active boolean default true;
