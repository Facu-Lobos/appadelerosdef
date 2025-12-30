-- Enable the pg_net extension to make HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to send Push Notification via OneSignal
CREATE OR REPLACE FUNCTION public.send_push_notification()
RETURNS trigger AS $$
DECLARE
  recipient_id text;
  sender_name text;
  message_content text;
  api_key text := 'os_v2_app_bwsqqsvxkjfd5ljqzky23qosfjewjq3afgtuutvplev66vdrnd3naozj67xuik4oery24n4dqxv6sfdaorialz5upojzicjnt7wfk3y';
  app_id text := '0da5084a-b752-4a3e-ad30-cab1adc1d22a';
  response_code int;
BEGIN
  -- We need to fetch the OneSignal Player ID? 
  -- No, OneSignal allows targeting by 'external_id' which matches our auth.uid if we used OneSignal.login(uid)
  
  -- Get sender name
  SELECT name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  -- Prepare content
  message_content := 'Nuevo mensaje de ' || COALESCE(sender_name, 'Alguien');

  -- Make HTTP Request to OneSignal
  -- NOTE: This requires the pg_net extension
  
  -- The body must be a JSON string.
  -- We target 'include_aliases' -> 'external_id' = [NEW.receiver_id]
  
  PERFORM net.http_post(
      url := 'https://onesignal.com/api/v1/notifications',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Basic ' || api_key
      ),
      body := jsonb_build_object(
          'app_id', app_id,
          'target_channel', 'push',
          'include_aliases', jsonb_build_object('external_id', jsonb_build_array(NEW.receiver_id)), 
          'headings', jsonb_build_object('en', 'Nuevo Mensaje'),
          'contents', jsonb_build_object('en', message_content),
          'url', 'https://appadeleros.vercel.app/player/community?chatWith=' || NEW.sender_id -- Deeplink logic
      )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger on Messages table
DROP TRIGGER IF EXISTS on_message_created_push ON public.messages;

CREATE TRIGGER on_message_created_push
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_notification();
