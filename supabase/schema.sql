-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  role text check (role in ('player', 'club')) not null,
  name text,
  avatar_url text,
  location text,
  category text, -- For players (e.g., '6ta')
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Clubs table (additional details for clubs, linked to profiles)
-- Ideally, club profile data is in 'profiles', but we might want a separate table for specific club metadata if it grows.
-- For now, we'll assume 'profiles' holds basic info, but let's create a 'clubs' table for discovery.

create table public.clubs (
  id uuid references public.profiles(id) on delete cascade not null primary key,
  name text not null,
  location text not null,
  description text,
  courts_count int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.clubs enable row level security;

create policy "Clubs are viewable by everyone."
  on public.clubs for select
  using ( true );

create policy "Club owners can update their club."
  on public.clubs for update
  using ( auth.uid() = id );
  
create policy "Club owners can insert their club."
  on public.clubs for insert
  with check ( auth.uid() = id );

-- Courts table
create table public.courts (
  id uuid default uuid_generate_v4() primary key,
  club_id uuid references public.clubs(id) on delete cascade not null,
  name text not null, -- e.g., "Cancha 1"
  surface text, -- e.g., "Sintético", "Cemento"
  is_indoor boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.courts enable row level security;

create policy "Courts are viewable by everyone."
  on public.courts for select
  using ( true );

create policy "Clubs can manage their courts."
  on public.courts for all
  using ( auth.uid() = club_id );

-- Bookings table
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  court_id uuid references public.courts(id) on delete cascade not null,
  player_id uuid references public.profiles(id) on delete cascade not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text check (status in ('pending', 'confirmed', 'cancelled')) default 'confirmed',
  price decimal(10, 2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.bookings enable row level security;

create policy "Bookings are viewable by everyone (or maybe just involved parties? for now everyone to see availability)."
  on public.bookings for select
  using ( true );

create policy "Players can create bookings."
  on public.bookings for insert
  with check ( auth.uid() = player_id );

-- Tournaments table
create table public.tournaments (
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

-- Tournament Matches
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


-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'role', 'player'), coalesce(new.raw_user_meta_data->>'name', 'New User'), new.raw_user_meta_data->>'avatar_url');
  
  -- If role is club, also insert into clubs
  if (new.raw_user_meta_data->>'role' = 'club') then
    insert into public.clubs (id, name, location)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', 'New Club'), 'Ubicación pendiente');
  end if;
  
  return new;
end;
$$;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Ranking Points table
create table public.ranking_points (
  id uuid default uuid_generate_v4() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  player_id uuid references public.profiles(id) on delete cascade not null,
  points int not null default 0,
  category text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(tournament_id, player_id)
);

alter table public.ranking_points enable row level security;

create policy "Ranking points are viewable by everyone."
  on public.ranking_points for select
  using ( true );

create policy "Clubs can manage ranking points."
  on public.ranking_points for all
  using ( exists ( select 1 from public.tournaments where id = ranking_points.tournament_id and club_id = auth.uid() ) );
