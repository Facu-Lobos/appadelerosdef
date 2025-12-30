-- Force Re-creation of the Trigger
DROP TRIGGER IF EXISTS on_message_created_push ON public.messages;

CREATE TRIGGER on_message_created_push
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_notification();
