# WhenFree

A mobile-first When2meet alternative. Select time slots with two taps instead of dragging.

## Features

- Create events with custom date ranges and time windows
- No accounts — participants join by name
- Tap-based time selection with cross-day range support
- Real-time sync via Supabase Realtime
- Group availability heatmap
- Filter results by minimum duration and minimum attendance
- One-click copy of results

## Tech Stack

React + TypeScript + Vite · Supabase (Postgres + Realtime) · Tailwind CSS v4 · Vercel

## Development

```bash
npm install
npm run dev
```

Create `.env.local`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
