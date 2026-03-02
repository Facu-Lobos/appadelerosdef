-- 1. Fix Tournament Registrations
ALTER TABLE public.tournament_registrations
DROP CONSTRAINT IF EXISTS tournament_registrations_player1_id_fkey,
DROP CONSTRAINT IF EXISTS tournament_registrations_player2_id_fkey;

ALTER TABLE public.tournament_registrations
ADD CONSTRAINT tournament_registrations_player1_id_fkey
FOREIGN KEY (player1_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT tournament_registrations_player2_id_fkey
FOREIGN KEY (player2_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Fix Match Requests
ALTER TABLE public.match_requests
DROP CONSTRAINT IF EXISTS match_requests_player_id_fkey;

ALTER TABLE public.match_requests
ADD CONSTRAINT match_requests_player_id_fkey
FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Fix Match Applications
ALTER TABLE public.match_applications
DROP CONSTRAINT IF EXISTS match_applications_player_id_fkey;

ALTER TABLE public.match_applications
ADD CONSTRAINT match_applications_player_id_fkey
FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Fix Friendships
ALTER TABLE public.friendships
DROP CONSTRAINT IF EXISTS friendships_requester_id_fkey,
DROP CONSTRAINT IF EXISTS friendships_receiver_id_fkey;

ALTER TABLE public.friendships
ADD CONSTRAINT friendships_requester_id_fkey
FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT friendships_receiver_id_fkey
FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. Fix Messages
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey,
DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

ALTER TABLE public.messages
ADD CONSTRAINT messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT messages_receiver_id_fkey
FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. Fix Favorite Clubs
ALTER TABLE public.favorite_clubs
DROP CONSTRAINT IF EXISTS favorite_clubs_user_id_fkey;

ALTER TABLE public.favorite_clubs
ADD CONSTRAINT favorite_clubs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 7. Fix Ranking Points
ALTER TABLE public.ranking_points
DROP CONSTRAINT IF EXISTS ranking_points_player_id_fkey;

ALTER TABLE public.ranking_points
ADD CONSTRAINT ranking_points_player_id_fkey
FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 8. Fix Tournament Matches Connections (Just in case they reference missing tables)
ALTER TABLE public.tournament_matches
DROP CONSTRAINT IF EXISTS tournament_matches_team1_id_fkey,
DROP CONSTRAINT IF EXISTS tournament_matches_team2_id_fkey,
DROP CONSTRAINT IF EXISTS tournament_matches_winner_id_fkey;

ALTER TABLE public.tournament_matches
ADD CONSTRAINT tournament_matches_team1_id_fkey
FOREIGN KEY (team1_id) REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
ADD CONSTRAINT tournament_matches_team2_id_fkey
FOREIGN KEY (team2_id) REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
ADD CONSTRAINT tournament_matches_winner_id_fkey
FOREIGN KEY (winner_id) REFERENCES public.tournament_registrations(id) ON DELETE CASCADE;
