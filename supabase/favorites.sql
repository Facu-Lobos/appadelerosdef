-- Create Favorites Table
create table if not exists public.favorite_clubs (
    user_id uuid references public.profiles(id) on delete cascade not null,
    club_id uuid references public.clubs(id) on delete cascade not null,
    created_at timestamptz default now(),
    primary key (user_id, club_id)
);

-- Enable RLS
alter table public.favorite_clubs enable row level security;

-- Policies
create policy "Users can view their own favorites"
    on public.favorite_clubs for select
    using (auth.uid() = user_id);

create policy "Users can insert their own favorites"
    on public.favorite_clubs for insert
    with check (auth.uid() = user_id);

create policy "Users can delete their own favorites"
    on public.favorite_clubs for delete
    using (auth.uid() = user_id);
