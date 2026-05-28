# Disc Golf League

Lightweight Next.js + Supabase + Drizzle starter for tracking a disc golf league.

## Stack

- Next.js App Router + TypeScript
- Supabase Auth + Postgres
- Drizzle ORM + Drizzle Kit migrations
- Tailwind CSS (minimal styling)

## Required Environment Variables

Copy `.env.example` to `.env` and fill:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase Setup

1. Create a new Supabase project.
2. In **Settings → API**, copy the **Project URL** (`https://<ref>.supabase.co`) and anon key into `.env`.
   - `NEXT_PUBLIC_SUPABASE_URL` must be that project URL — **not** the database pooler host (`*.pooler.supabase.com`).
3. In **Settings → Database**, copy the connection string into `DATABASE_URL` (pooler on port `6543` is fine for Drizzle).
4. In **Settings → API**, copy the service role key into `.env`.
5. Create at least one Supabase Auth user for admin login (Authentication → Users).

## Install

```bash
npm install
```

## Run Migrations

Generate new migration files from schema:

```bash
npm run db:generate
```

Apply migrations:

```bash
npm run db:migrate
```

## Seed Local Data

```bash
npm run db:seed
```

This adds:

- 1 league
- 1 course
- 18 holes
- 4 players
- PlayerLeague rows for all players
- 1 LeagueEvent
- PlayerHole rows for each player/hole pair

## Run Locally

```bash
npm run dev
```

## Deploy to Vercel

1. Push project to GitHub.
2. Import repository in Vercel.
3. Set environment variables in Vercel project settings.
4. Deploy.

## Routes

### Admin (auth required)

- `/admin`
- `/admin/players`
- `/admin/courses`
- `/admin/courses/[id]/holes`
- `/admin/leagues`
- `/admin/leagues/[id]/events`
- `/admin/events/[id]/scores`

### Public (read only)

- `/standings`
- `/players`
- `/players/[id]`
- `/courses`
- `/leagues`
- `/leagues/[id]`
- `/events/[id]`
