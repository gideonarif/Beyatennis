-- Run this in Supabase Dashboard → SQL Editor

-- Players (roster + profile photo URL)
create table if not exists public.players (
  id text primary key,
  name text not null,
  "group" text not null check ("group" in ('A', 'B')),
  avatar_url text,
  updated_at timestamptz not null default now()
);

-- Match results (JSON matches app Result type)
create table if not exists public.match_results (
  match_id text primary key,
  result jsonb not null,
  updated_at timestamptz not null default now()
);

-- Seed roster
insert into public.players (id, name, "group") values
  ('naty', 'Naty', 'A'),
  ('bereket', 'Bereket', 'A'),
  ('wogderes', 'Wogderes', 'A'),
  ('dere', 'Dere', 'A'),
  ('tade', 'Tade', 'A'),
  ('gedion', 'Gedion', 'B'),
  ('yetagesu', 'Yetagesu', 'B'),
  ('melaku', 'Melaku', 'B'),
  ('nafkot', 'Nafkot', 'B'),
  ('kirubel', 'Kirubel', 'B')
on conflict (id) do nothing;

alter table public.players enable row level security;
alter table public.match_results enable row level security;

create policy "players_select" on public.players for select using (true);
create policy "players_update" on public.players for update using (true);
create policy "match_results_select" on public.match_results for select using (true);
create policy "match_results_insert" on public.match_results for insert with check (true);
create policy "match_results_update" on public.match_results for update using (true);
create policy "match_results_delete" on public.match_results for delete using (true);

-- Profile photos bucket (public read)
insert into storage.buckets (id, name, public)
values ('player-avatars', 'player-avatars', true)
on conflict (id) do update set public = true;

create policy "avatars_select" on storage.objects
  for select using (bucket_id = 'player-avatars');

create policy "avatars_insert" on storage.objects
  for insert with check (bucket_id = 'player-avatars');

create policy "avatars_update" on storage.objects
  for update using (bucket_id = 'player-avatars');

create policy "avatars_delete" on storage.objects
  for delete using (bucket_id = 'player-avatars');

-- Realtime (enable in Dashboard → Database → Replication if needed)
alter publication supabase_realtime add table public.match_results;
alter publication supabase_realtime add table public.players;
