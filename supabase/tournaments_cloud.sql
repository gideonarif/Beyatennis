-- Run in Supabase Dashboard → SQL Editor if you already ran an older schema.sql
-- Adds cloud sync for tournaments and scopes match results per tournament.

-- Tournaments table
create table if not exists public.tournaments (
  id text primary key,
  config jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.tournaments enable row level security;

drop policy if exists "tournaments_select" on public.tournaments;
drop policy if exists "tournaments_insert" on public.tournaments;
drop policy if exists "tournaments_update" on public.tournaments;
drop policy if exists "tournaments_delete" on public.tournaments;

create policy "tournaments_select" on public.tournaments for select using (true);
create policy "tournaments_insert" on public.tournaments for insert with check (true);
create policy "tournaments_update" on public.tournaments for update using (true);
create policy "tournaments_delete" on public.tournaments for delete using (true);

-- Scope match results to tournaments
alter table public.match_results
  add column if not exists tournament_id text not null default 'hawassa-open-2026';

-- Migrate legacy single-column primary key to composite key
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'match_results_pkey'
      and conrelid = 'public.match_results'::regclass
  ) then
    alter table public.match_results drop constraint match_results_pkey;
  end if;
exception
  when others then null;
end $$;

alter table public.match_results
  drop constraint if exists match_results_pkey;

alter table public.match_results
  add constraint match_results_pkey primary key (match_id, tournament_id);

update public.match_results
set tournament_id = 'hawassa-open-2026'
where tournament_id is null;

-- Realtime for tournaments (ignore error if already added)
do $$
begin
  alter publication supabase_realtime add table public.tournaments;
exception
  when duplicate_object then null;
end $$;
