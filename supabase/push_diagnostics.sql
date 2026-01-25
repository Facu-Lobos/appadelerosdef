-- TABLA DE DIAGNOSTICO
create table if not exists public.push_logs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default now(),
    status text,
    response text,
    payload text
);

-- FUNCION DE PRUEBA DIRECTA
create or replace function public.test_push_debug()
returns jsonb as $$
declare
  -- IMPORTANTE: Reemplaza esto con tu REST API Key real dentro de Supabase.
  -- NO la subas a GitHub.
  api_key text := 'TU_ONESIGNAL_REST_API_KEY_AQUI';
  app_id text := '0da5084a-b752-4a3e-ad30-cab1adc1d22a';
  request_body jsonb;
  request_id int;
begin
  request_body := jsonb_build_object(
      'app_id', app_id,
      'target_channel', 'push',
      'included_segments', jsonb_build_array('Total Subscriptions'), -- PRUEBA GLOBAL
      'headings', jsonb_build_object('en', 'Test de Debug'),
      'contents', jsonb_build_object('en', 'Si lees esto, Supabase habla con OneSignal')
  );

  -- Loguear intento
  insert into public.push_logs (status, payload) values ('ATTEMPT', request_body::text);

  -- Hacer petición SÍNCRONA (solo para debug, pg_net suele ser async pero validemos si net.http_post devuelve ID)
  select net.http_post(
      url := 'https://onesignal.com/api/v1/notifications',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Basic ' || api_key
      ),
      body := request_body
  ) into request_id;

  -- Loguear ID de petición
  insert into public.push_logs (status, response) values ('SENT', 'Request ID: ' || request_id::text);
  
  return jsonb_build_object('success', true, 'request_id', request_id);
end;
$$ language plpgsql security definer;
