-- 1. Habilitar la extensión para peticiones HTTP
create extension if not exists pg_net;

-- 2. Función Helper Genérica para enviar a OneSignal
-- Primero borramos la versión anterior para evitar errores de cambio de nombre de parámetros (Error 42P13)
drop function if exists public.send_push_notification_fn(text[], text, text, text);

create or replace function public.send_push_notification_fn(
    receiver_ids text[],      -- Array de IDs de usuario (auths.id)
    title text,               -- Título de la notificación
    content text,             -- Mensaje
    launch_url text default null -- URL a abrir (opcional)
)
returns void as $$
declare
  -- IMPORTANTE: Reemplaza esto con tu REST API Key real dentro de Supabase.
  -- NO la subas a GitHub.
  api_key text := 'TU_ONESIGNAL_REST_API_KEY_AQUI';
  app_id text := '0da5084a-b752-4a3e-ad30-cab1adc1d22a';
  request_body jsonb;
begin
  -- Construir el JSON del body para OneSignal
  request_body := jsonb_build_object(
      'app_id', app_id,
      'target_channel', 'push',
      'include_aliases', jsonb_build_object('external_id', receiver_ids),
      'headings', jsonb_build_object('en', title, 'es', title),
      'contents', jsonb_build_object('en', content, 'es', content)
  );

  -- Agregar URL si existe
  if launch_url is not null then
      -- Asegurar que la URL sea absoluta o compatible con el frontend
      -- OneSignal suele manejar paths relativos si la app está configurada, 
      -- pero para web a veces es mejor full URL.
      -- Si es relativa, prepende el dominio de vercel
      if launch_url not like 'http%' then
         request_body := request_body || jsonb_build_object('url', 'https://appadeleros.vercel.app' || launch_url);
      else
         request_body := request_body || jsonb_build_object('url', launch_url);
      end if;
  end if;

  -- Realizar la petición HTTP POST asíncrona mediante pg_net
  perform net.http_post(
      url := 'https://onesignal.com/api/v1/notifications',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Basic ' || api_key
      ),
      body := request_body
  );
end;
$$ language plpgsql security definer;


-- 3. Trigger para NUEVOS MENSAJES (chat)
create or replace function public.notify_new_message()
returns trigger as $$
declare
  sender_name text;
begin
    -- Obtener nombre del remitente
    select name into sender_name from public.profiles where id = new.sender_id;
    
    -- Llamar a la función helper
    perform public.send_push_notification_fn(
        array[new.receiver_id::text], 
        'Nuevo Mensaje 💬', 
        coalesce(sender_name, 'Alguien') || ': ' || left(new.content, 50),
        '/player/community?chatWith=' || new.sender_id
    );

    return new;
end;
$$ language plpgsql security definer;

-- Limpieza de triggers viejos/duplicados
drop trigger if exists on_message_created_push on public.messages; -- El viejo
drop trigger if exists on_new_message on public.messages;          -- El nuevo (por si existe)

create trigger on_new_message
  after insert on public.messages
  for each row
  execute function public.notify_new_message();


-- 4. Trigger para AMISTADES (Friendships)
create or replace function public.notify_friend_update()
returns trigger as $$
declare
  requester_name text;
  receiver_name text;
begin
    -- Caso 1: Nueva Solicitud (INSERT con status 'pending')
    if (tg_op = 'INSERT') and (new.status = 'pending') then
        
        select name into requester_name from public.profiles where id = new.requester_id;
        
        perform public.send_push_notification_fn(
            array[new.receiver_id::text], 
            'Solicitud de Amistad 👥', 
            coalesce(requester_name, 'Alguien') || ' quiere conectar contigo.',
            '/player/community'
        );

    -- Caso 2: Solicitud Aceptada (UPDATE a status 'accepted')
    elsif (tg_op = 'UPDATE') and (old.status = 'pending') and (new.status = 'accepted') then
        
        -- Notificar al que envió la solicitud original (requester)
        select name into receiver_name from public.profiles where id = new.receiver_id;
        
        perform public.send_push_notification_fn(
            array[new.requester_id::text], 
            '¡Solicitud Aceptada! ✅', 
            coalesce(receiver_name, 'El usuario') || ' aceptó tu solicitud.',
            '/player/community'
        );
        
    end if;

    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_friend_update on public.friendships;

create trigger on_friend_update
  after insert or update on public.friendships
  for each row
  execute function public.notify_friend_update();
