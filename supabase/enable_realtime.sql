-- ==========================================
-- BARYONIC RIDE - REALTIME CONFIGURATION
-- ==========================================

-- Enable Realtime for match_applications table
-- This allows Supabase to broadcast INSERT/UPDATE events to clients
begin;
  -- Try to add the table to the publication. 
  -- If 'supabase_realtime' publication doesn't exist, this might fail, 
  -- but standard Supabase projects have it.
  alter publication supabase_realtime add table match_applications;
commit;
