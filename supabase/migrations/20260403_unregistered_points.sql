-- Up migration
ALTER TABLE public.ranking_points DROP CONSTRAINT IF EXISTS ranking_points_tournament_id_player_id_key;
ALTER TABLE public.ranking_points ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE public.ranking_points ADD COLUMN IF NOT EXISTS player_name text;

-- Update the new user trigger to automatically link
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, name, avatar_url)
  VALUES (new.id, new.email, coalesce(new.raw_user_meta_data->>'role', 'player'), coalesce(new.raw_user_meta_data->>'name', 'New User'), new.raw_user_meta_data->>'avatar_url');
  
  -- If role is club, also insert into clubs
  IF (new.raw_user_meta_data->>'role' = 'club') THEN
    INSERT INTO public.clubs (id, name, location)
    VALUES (new.id, coalesce(new.raw_user_meta_data->>'name', 'New Club'), 'Ubicación pendiente');
  END IF;

  -- Attempt to link historical unregistered data for this user
  IF (new.raw_user_meta_data->>'name' IS NOT NULL) THEN
      UPDATE public.ranking_points
      SET player_id = new.id
      WHERE player_id IS NULL AND player_name ILIKE (new.raw_user_meta_data->>'name');

      UPDATE public.tournament_registrations
      SET player1_id = new.id
      WHERE player1_id IS NULL AND player1_name ILIKE (new.raw_user_meta_data->>'name');

      UPDATE public.tournament_registrations
      SET player2_id = new.id
      WHERE player2_id IS NULL AND player2_name ILIKE (new.raw_user_meta_data->>'name');
  END IF;
  
  RETURN new;
END;
$$;
