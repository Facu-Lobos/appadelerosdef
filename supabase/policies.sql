-- ==========================================
-- BARYONIC RIDE - SECURITY POLICIES (RLS)
-- ==========================================

-- 1. MATCH APPLICATIONS (Solicitudes de Partido)
-- ----------------------------------------------
alter table match_applications enable row level security;

-- Policy: Cualquiera puede ver las solicitudes
drop policy if exists "Public view applications" on match_applications;
create policy "Public view applications" 
on match_applications for select 
using (true);

-- Policy: Solo puedo crear una solicitud para mí mismo
drop policy if exists "Users can apply themselves" on match_applications;
create policy "Users can apply themselves" 
on match_applications for insert 
with check (auth.uid() = player_id);

-- Policy: Creador y solicitante pueden actualizar
drop policy if exists "Creators and applicants can update" on match_applications;
create policy "Creators and applicants can update" 
on match_applications for update 
using (
  exists (
    select 1 from match_requests mr 
    where mr.id = match_applications.match_id 
    and mr.player_id = auth.uid()
  )
  or 
  auth.uid() = player_id
);

-- 2. MESSAGES (Mensajería)
-- ------------------------
alter table messages enable row level security;

-- Policy: Ver mis mensajes
drop policy if exists "Users can see their own messages" on messages;
create policy "Users can see their own messages" 
on messages for select 
using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Policy: Enviar como yo mismo
drop policy if exists "Users can insert their own messages" on messages;
create policy "Users can insert their own messages" 
on messages for insert 
with check (auth.uid() = sender_id);

-- Policy: Destinatario puede marcar como leído
drop policy if exists "Receiver can mark as read" on messages;
create policy "Receiver can mark as read" 
on messages for update 
using (auth.uid() = receiver_id);

-- 3. MATCH REQUESTS (Partidos)
-- ----------------------------
alter table match_requests enable row level security;

drop policy if exists "Public view matches" on match_requests;
create policy "Public view matches" 
on match_requests for select 
using (true);

drop policy if exists "Users can create matches" on match_requests;
create policy "Users can create matches" 
on match_requests for insert 
with check (auth.uid() = player_id);

drop policy if exists "Users can update own matches" on match_requests;
create policy "Users can update own matches" 
on match_requests for update 
using (auth.uid() = player_id);

drop policy if exists "Users can delete own matches" on match_requests;
create policy "Users can delete own matches" 
on match_requests for delete 
using (auth.uid() = player_id);
