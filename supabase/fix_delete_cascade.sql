-- Drop existing foreign key constraint from tournaments
ALTER TABLE public.tournaments
DROP CONSTRAINT IF EXISTS tournaments_club_id_fkey;

-- Re-add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE public.tournaments
ADD CONSTRAINT tournaments_club_id_fkey
FOREIGN KEY (club_id)
REFERENCES public.clubs(id)
ON DELETE CASCADE;

-- Also check courts just in case
ALTER TABLE public.courts
DROP CONSTRAINT IF EXISTS courts_club_id_fkey;

ALTER TABLE public.courts
ADD CONSTRAINT courts_club_id_fkey
FOREIGN KEY (club_id)
REFERENCES public.clubs(id)
ON DELETE CASCADE;

-- And clubs
ALTER TABLE public.clubs
DROP CONSTRAINT IF EXISTS clubs_id_fkey;

ALTER TABLE public.clubs
ADD CONSTRAINT clubs_id_fkey
FOREIGN KEY (id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- And profiles
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;
