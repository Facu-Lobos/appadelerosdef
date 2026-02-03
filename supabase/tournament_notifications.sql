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
  tournament_name text;
  msg_title text;
  msg_content text;
  
  -- Variables to hold player IDs
  t1_p1 uuid;
  t1_p2 uuid;
  t2_p1 uuid;
  t2_p2 uuid;
BEGIN
    -- Only trigger if score changed and is not null
    IF (OLD.score IS DISTINCT FROM NEW.score) AND (NEW.score IS NOT NULL) THEN
        
        -- Get Tournament Name
        SELECT name INTO tournament_name 
        FROM public.tournaments 
        WHERE id = NEW.tournament_id;

        -- Get Player IDs from Team Registrations
        -- Team 1
        IF NEW.team1_id IS NOT NULL THEN
             SELECT player1_id, player2_id INTO t1_p1, t1_p2
             FROM public.tournament_registrations
             WHERE id = NEW.team1_id;
        END IF;

        -- Team 2
        IF NEW.team2_id IS NOT NULL THEN
             SELECT player1_id, player2_id INTO t2_p1, t2_p2
             FROM public.tournament_registrations
             WHERE id = NEW.team2_id;
        END IF;

        -- Construct Message
        msg_title := 'Resultado Actualizado 🎾';
        msg_content := 'Nuevo resultado en ' || COALESCE(tournament_name, 'el torneo') || ': ' || NEW.score;

        -- Notify ALL visible players
        -- Create array of valid IDs
        -- Since ARRAY_REMOVE doesn't remove NULLs nicely in one go if constructed manually, let's just call notify individually or build cleaner.
        
        -- Helper: Notify if ID exists
        IF t1_p1 IS NOT NULL THEN
             PERFORM public.send_push_notification_fn(ARRAY[t1_p1::text], msg_title, msg_content, '/player/tournament/match/' || NEW.id || '?share=true');
        END IF;
        IF t1_p2 IS NOT NULL THEN
             PERFORM public.send_push_notification_fn(ARRAY[t1_p2::text], msg_title, msg_content, '/player/tournament/match/' || NEW.id || '?share=true');
        END IF;
        IF t2_p1 IS NOT NULL THEN
             PERFORM public.send_push_notification_fn(ARRAY[t2_p1::text], msg_title, msg_content, '/player/tournament/match/' || NEW.id || '?share=true');
        END IF;
        IF t2_p2 IS NOT NULL THEN
             PERFORM public.send_push_notification_fn(ARRAY[t2_p2::text], msg_title, msg_content, '/player/tournament/match/' || NEW.id || '?share=true');
        END IF;
        
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
