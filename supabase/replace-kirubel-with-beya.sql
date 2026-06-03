-- Run in Supabase SQL Editor if you already seeded Kirubel

insert into public.players (id, name, "group")
values ('beya', 'Beya', 'B')
on conflict (id) do update set name = excluded.name, "group" = excluded."group";

delete from public.players where id = 'kirubel';

-- Match IDs changed in the app; re-enter scores for Beya's matches if needed.
