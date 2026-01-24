-- Asegurarse de que el script anterior (send_push_notification_fn) ya se haya corrido.

-- 1. Trigger para Mensajes de Chat (Tabla 'messages')
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger AS $$
DECLARE
  sender_name text;
BEGIN
    -- Obtener nombre del remitente
    SELECT name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
    
    PERFORM public.send_push_notification_fn(
        ARRAY[NEW.receiver_id::text], 
        'Nuevo Mensaje 💬', 
        COALESCE(sender_name, 'Alguien') || ': ' || LEFT(NEW.content, 50),
        -- URL para abrir directo el chat (ajustar segun rutas de tu app)
        '/player/community?chatWith=' || NEW.sender_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();


-- 2. Trigger para Solicitudes de Amistad (Tabla 'friendships')
CREATE OR REPLACE FUNCTION public.notify_friend_update()
RETURNS trigger AS $$
DECLARE
  requester_name text;
  receiver_name text;
BEGIN
    -- Caso 1: Nueva Solicitud (INSERT con status 'pending')
    IF (TG_OP = 'INSERT') AND (NEW.status = 'pending') THEN
        
        SELECT name INTO requester_name FROM public.profiles WHERE id = NEW.requester_id;
        
        PERFORM public.send_push_notification_fn(
            ARRAY[NEW.receiver_id::text], 
            'Nueva Solicitud de Amistad 👥', 
            COALESCE(requester_name, 'Alguien') || ' quiere conectar contigo.',
            '/player/community'
        );

    -- Caso 2: Solicitud Aceptada (UPDATE a status 'accepted')
    ELSIF (TG_OP = 'UPDATE') AND (OLD.status = 'pending') AND (NEW.status = 'accepted') THEN
        
        -- Notificar al que envió la solicitud original (requester)
        SELECT name INTO receiver_name FROM public.profiles WHERE id = NEW.receiver_id;
        
        PERFORM public.send_push_notification_fn(
            ARRAY[NEW.requester_id::text], 
            '¡Solicitud Aceptada! ✅', 
            COALESCE(receiver_name, 'El usuario') || ' aceptó tu solicitud.',
            '/player/community'
        );
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friend_update ON public.friendships;
CREATE TRIGGER on_friend_update
  AFTER INSERT OR UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_update();
