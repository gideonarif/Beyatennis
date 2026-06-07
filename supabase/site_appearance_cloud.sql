-- Run in Supabase Dashboard → SQL Editor
-- Adds site-wide appearance settings.
-- Banner/background images use the existing player-avatars bucket (no extra buckets needed).

create table if not exists public.site_settings (
  id text primary key,
  appearance jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_select" on public.site_settings;
drop policy if exists "site_settings_insert" on public.site_settings;
drop policy if exists "site_settings_update" on public.site_settings;

create policy "site_settings_select" on public.site_settings for select using (true);
create policy "site_settings_insert" on public.site_settings for insert with check (true);
create policy "site_settings_update" on public.site_settings for update using (true);

-- Realtime for site settings (ignore error if already added)
do $$
begin
  alter publication supabase_realtime add table public.site_settings;
exception
  when duplicate_object then null;
end $$;
