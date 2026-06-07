# Table Tennis Tournament Tracker

Responsive web app for managing a table tennis tournament with live scoring, standings, knockout bracket, and player profile photos.

## Run locally

```bash
npm install
cp .env.example .env
# Add your Supabase URL and anon key to .env
npm run dev
```

## Supabase setup (scores + profile photos)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the full script in [`supabase/schema.sql`](supabase/schema.sql).
3. In **Project Settings → API**, copy:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`
4. Paste both into a `.env` file in the project root (see `.env.example`).
5. Restart `npm run dev`.

### What Supabase stores

| Data | Table / Storage |
|------|-----------------|
| **Tournaments** | `tournaments` (syncs across phone, laptop, etc.) |
| Match scores | `match_results` (per tournament, live sync) |
| Profile photo URLs | `players.avatar_url` |
| Image files | Storage bucket `player-avatars` |

Without `.env`, the app falls back to **browser localStorage** only (data stays on that device).

### Existing Supabase projects

If you already ran an older `schema.sql`, also run [`supabase/tournaments_cloud.sql`](supabase/tournaments_cloud.sql) in the SQL Editor to add the tournaments table and scope scores by tournament.

## Features

- **Schedule** — Day selector, group matches, Sunday knockout
- **Standings** — Fixed player order per group, live points
- **Bracket** — Auto-generated from group results
- **Players** — Tap for match history; **Admin** can upload profile photos
- **Admin** — Password `Faith1234` to enter scores (client-side gate)
- **Viewer** — Read-only schedule and standings

## Scoring rules

- Each game: first to **21** points; at **20–20**, play continues until one player leads by **2**
- Best of 3 games (match)
- **Group stage:** **2–0** → winner **3** pts, loser **0**; **2–1** (Game 3) → winner **2**, loser **1**
- **Knockout:** **2–0** → winner **3** pts, loser **0**; **2–1** → winner **2**, loser **1**
