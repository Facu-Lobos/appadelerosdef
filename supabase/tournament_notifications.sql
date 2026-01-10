-- 1. Generalize the sending function to accept arguments (OVERLOADING)
-- This allows us to reuse the logic without breaking the existing trigger
CREATE OR REPLACE FUNCTION public.send_push_notification_fn(
    receiver_ids text[],
    title text,
    content text,
    url_path text
)
RETURNS void AS $$
DECLARE
  api_key text := 'os_v2_app_bwsqqsvxkjfd5ljqzky23qosfjewjq3afgtuutvplev66vdrnd3naozj67xuik4oery24n4dqxv6sfdaorialz5upojzicjnt7wfk3y';
  app_id text := '0da5084a-b752-4a3e-ad30-cab1adc1d22a';
BEGIN
  -- Perform request
  PERFORM net.http_post(
      url := 'https://onesignal.com/api/v1/notifications',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Basic ' || api_key
      ),
      body := jsonb_build_object(
          'app_id', app_id,
          'target_channel', 'push',
          'priority', 10,
          'ios_sound', 'default',
          'include_aliases', jsonb_build_object('external_id', to_jsonb(receiver_ids)), 
          'headings', jsonb_build_object('en', title),
          'contents', jsonb_build_object('en', content),
          'url', 'https://appadeleros.vercel.app' || url_path
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Create the Trigger Function specifically for Tournament Matches
CREATE OR REPLACE FUNCTION public.notify_match_score_update()
RETURNS trigger AS $$
DECLARE
  player1_name text;
  player2_name text;
  team1_name text;
  team2_name text;
  tournament_name text;
  msg_title text;
  msg_content text;
BEGIN
    -- Only trigger if score changed and is not null
    IF (OLD.score IS DISTINCT FROM NEW.score) AND (NEW.score IS NOT NULL) THEN
        
        -- Get Tournament Name
        SELECT name INTO tournament_name 
        FROM public.tournaments 
        WHERE id = NEW.tournament_id;

        -- Construct Message
        msg_title := 'Resultado Actualizado 🎾';
        msg_content := 'Nuevo resultado en ' || COALESCE(tournament_name, 'el torneo') || ': ' || NEW.score;

        -- Notify Player 1 (if exists)
        IF NEW.player1_id IS NOT NULL THEN
             PERFORM public.send_push_notification_fn(
                ARRAY[NEW.player1_id::text], 
                msg_title, 
                msg_content, 
                '/player/tournament/match/' || NEW.id || '?share=true'
             );
        END IF;

        -- Notify Player 2 (if exists)
        IF NEW.player2_id IS NOT NULL THEN
             PERFORM public.send_push_notification_fn(
                ARRAY[NEW.player2_id::text], 
                msg_title, 
                msg_content, 
                '/player/tournament/match/' || NEW.id || '?share=true'
             );
        END IF;

        -- Notify Partner 1 (if double, optional, assuming matches table structure)
        -- Notify Partner 2 (if double, optional)
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Attach Trigger to tournament_matches
DROP TRIGGER IF EXISTS on_match_score_update ON public.tournament_matches;

CREATE TRIGGER on_match_score_update
  AFTER UPDATE ON public.tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_match_score_update();
