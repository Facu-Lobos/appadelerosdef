-- Add new columns for Liga Paternidad

-- Tournaments:
-- total_dates: the total number of dates configured for this league.
-- current_date: the current date that has been generated (to know when the league finishes).
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS total_dates integer,
ADD COLUMN IF NOT EXISTS current_date integer default 0;

-- Tournament Matches:
-- Since Liga Paternidad matches are 2v2 with individual registrations,
-- team1_id is player 1, team1_partner_id is player 2.
-- team2_id is player 3, team2_partner_id is player 4.
-- match_date keeps track of which "fecha" this match belongs to.
ALTER TABLE public.tournament_matches
ADD COLUMN IF NOT EXISTS team1_partner_id uuid references public.tournament_registrations(id),
ADD COLUMN IF NOT EXISTS team2_partner_id uuid references public.tournament_registrations(id),
ADD COLUMN IF NOT EXISTS match_date integer;
