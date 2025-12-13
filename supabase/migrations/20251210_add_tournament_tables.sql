-- Run this script to add the missing tournament tables

-- Tournaments table (if it doesn't exist, though it might)
create table if not exists public.tournaments (
  id uuid default uuid_generate_v4() primary key,
  club_id uuid references public.clubs(id) on delete cascade not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  category text,
  max_teams int default 16,
  status text check (status in ('open', 'ongoing', 'finished')) default 'open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tournaments enable row level security;

create policy "Tournaments are viewable by everyone."
  on public.tournaments for select
  using ( true );

create policy "Clubs can manage their tournaments."
  on public.tournaments for all
  using ( auth.uid() = club_id );

-- Tournament Registrations
create table if not exists public.tournament_registrations (
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

-- Tournament Matches
create table if not exists public.tournament_matches (
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
