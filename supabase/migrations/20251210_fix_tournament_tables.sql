-- FORCE RECREATE TABLES
-- This ensures the Foreign Keys are correctly established.

DROP TABLE IF EXISTS public.tournament_matches;
DROP TABLE IF EXISTS public.tournament_registrations;
-- We don't drop tournaments to keep the tournament itself if possible, but if needed we can.
-- Let's try to keep tournaments but recreate the child tables which are the ones failing.

-- Re-create Tournament Registrations with explicit Foreign Keys
create table public.tournament_registrations (
  id uuid default uuid_generate_v4() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  team_name text,
  player1_id uuid references public.profiles(id),
  player2_id uuid references public.profiles(id),
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tournament_registrations enable row level security;

create policy "Registrations are viewable by everyone."
  on public.tournament_registrations for select
  using ( true );

create policy "Players can register."
  on public.tournament_registrations for insert
  with check ( auth.uid() = player1_id or auth.uid() = player2_id );

create policy "Clubs can manage registrations."
  on public.tournament_registrations for all
  using ( exists ( select 1 from public.tournaments where id = tournament_registrations.tournament_id and club_id = auth.uid() ) );

-- Re-create Tournament Matches
create table public.tournament_matches (
  id uuid default uuid_generate_v4() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  round text not null, -- 'group', 'quarter', 'semi', 'final'
  team1_id uuid references public.tournament_registrations(id),
  team2_id uuid references public.tournament_registrations(id),
  score text,
  winner_id uuid references public.tournament_registrations(id),
  court_id uuid references public.courts(id),
  start_time timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tournament_matches enable row level security;

create policy "Matches are viewable by everyone."
  on public.tournament_matches for select
  using ( true );

create policy "Clubs can manage matches."
  on public.tournament_matches for all
  using ( exists ( select 1 from public.tournaments where id = tournament_matches.tournament_id and club_id = auth.uid() ) );
