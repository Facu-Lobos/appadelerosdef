-- Create a debug table to verify trigger execution
CREATE TABLE IF NOT EXISTS public.push_logs (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default now(),
    message text,
    payload text
);

-- Update the function to log BEFORE sending
CREATE OR REPLACE FUNCTION public.send_push_notification()
RETURNS trigger AS $$
DECLARE
  recipient_id text;
  sender_name text;
  message_content text;
  api_key text := 'os_v2_app_bwsqqsvxkjfd5ljqzky23qosfjewjq3afgtuutvplev66vdrnd3naozj67xuik4oery24n4dqxv6sfdaorialz5upojzicjnt7wfk3y';
  app_id text := '0da5084a-b752-4a3e-ad30-cab1adc1d22a';
  request_body jsonb;
BEGIN
  -- Get sender name
  SELECT name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  -- Prepare content
  message_content := 'Nuevo mensaje de ' || COALESCE(sender_name, 'Alguien');
  
  -- Prepare Body
  request_body := jsonb_build_object(
          'app_id', app_id,
          'target_channel', 'push',
          'include_aliases', jsonb_build_object('external_id', jsonb_build_array(NEW.receiver_id)), 
          'headings', jsonb_build_object('en', 'Nuevo Mensaje'),
          'contents', jsonb_build_object('en', message_content),
          'url', 'https://appadeleros.vercel.app/player/community?chatWith=' || NEW.sender_id
      );

  -- LOG ATTEMPT
  INSERT INTO public.push_logs (message, payload)
  VALUES ('Intento de envío Push', request_body::text);

  -- Make HTTP Request
  PERFORM net.http_post(
      url := 'https://onesignal.com/api/v1/notifications',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Basic ' || api_key
      ),
      body := request_body
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
