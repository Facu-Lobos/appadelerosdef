-- Update the function with the CORRECT API KEY
CREATE OR REPLACE FUNCTION public.send_push_notification()
RETURNS trigger AS $$
DECLARE
  recipient_id text;
  sender_name text;
  message_content text;
  -- NEW KEY HERE:
  api_key text := 'os_v2_app_bwsqqsvxkjfd5ljqzky23qosflbtbv2l4rhufzew66mdxdmtipcc6po2tievji734kiyg4ati5w3rbdymiduoptyqhiinhewa6fnaoa';
  app_id text := '0da5084a-b752-4a3e-ad30-cab1adc1d22a';
  request_body jsonb;
BEGIN
  -- Obtener nombre
  SELECT name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  message_content := 'Mensaje de ' || COALESCE(sender_name, 'Alguien');
  
  -- Preparar datos
  request_body := jsonb_build_object(
          'app_id', app_id,
          'target_channel', 'push',
          'include_aliases', jsonb_build_object('external_id', jsonb_build_array(NEW.receiver_id)), 
          'headings', jsonb_build_object('en', 'Nuevo Mensaje'),
          'contents', jsonb_build_object('en', message_content),
          'url', 'https://appadeleros.vercel.app/player/community?chatWith=' || NEW.sender_id
      );

  -- GUARDAR LOG
  INSERT INTO public.push_logs (message, payload)
  VALUES ('Intento de envío con Nueva Key', request_body::text);

  -- Enviar a OneSignal
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
