-- Habilitar RLS en las tablas de logs para resolver advertencias de seguridad en Supabase
ALTER TABLE public.push_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Nota: No se crean políticas públicas. 
-- Las funciones con SECURITY DEFINER seguirán teniendo acceso.
