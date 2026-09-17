# muzi

**Real-time social jukebox.** Open a room, share one code, and let everyone's votes decide what plays next. No aux cord needed.

<img width="1494" height="764" alt="image" src="https://github.com/user-attachments/assets/ae67f2ea-3187-49d4-ae13-fdd2d0150763" />

muzi is a collaborative jam-session app: a host spins up a room (YouTube or Spotify), friends join with a five-character code from any browser, and upvotes reorder the shared queue live. Only the host controls playback — everyone else shapes what plays next.

## Features

- **Rooms with invite codes** — create a session, share the code, friends join in seconds
- **Democratic queue** — upvotes reorder the queue in real time for everyone in the room
- **YouTube + Spotify** — paste a link from either platform; titles, artwork, and playback are resolved automatically (oEmbed, no API keys needed)
- **Live sync over websockets** — votes, queue changes, and playback state land instantly (socket.io)
- **Host controls** — playback is owner-only; voting is open to every room member
- **Google sign-in** — via better-auth

## Stack

- **Next.js 16** (App Router, RSC) + **React 19** + **TypeScript**
- **Custom Node server** (`server.ts`) serving Next.js HTTP and socket.io on one process
- **PostgreSQL** + **Prisma** (source of truth) · **Redis (Upstash)** (queue cache-aside + sorted-set ranking)
- **better-auth** (Google OAuth + email/password)
- **Tailwind CSS v4** + **shadcn/ui** (base-nova preset, Outfit font)

## Architecture notes

- `server.ts` — one Node process for both Next.js and websockets. **This means serverless platforms (Vercel) won't keep sockets alive**; deploy to a Node host (Railway, Render, Fly.io, a VM, etc.).
- `lib/socket.ts` — socket.io bootstrap; auth via better-auth session cookie; playback control is owner-only, upvotes require room membership.
- `lib/upvote-service.ts` — write-through upvote cache: Postgres is the source of truth, Redis sorted set (`stream:{id}:queue`) serves ordered queue reads (cache-aside hydration on miss).
- `lib/socket-events.ts` — event names + payload types shared by client and server.

## Getting started

### 1. Environment variables

Create `.env`:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `BETTER_AUTH_SECRET` | Random secret for session signing |
| `BETTER_AUTH_URL` | App base URL (`http://localhost:3000` in dev) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

For Google OAuth, add `http://localhost:3000/api/auth/callback/google` (and your production equivalent) as an authorized redirect URI in Google Cloud Console.

### 2. Database

```bash
npx prisma migrate deploy   # apply migrations
npm run db:seed             # optional: demo jam room (code MUZI-JAM)
```

### 3. Run

```bash
npm install
npm run dev        # tsx server.ts — Next.js + socket.io on :3000
```

Production:

```bash
npm run build
npm start          # NODE_ENV=production tsx server.ts
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Next.js + socket.io) |
| `npm run build` / `npm start` | Production build / start |
| `npm run lint` | ESLint |
| `npm run db:seed` | Seed the demo room (`MUZI-JAM`) with tracks and votes |

Useful checks: `npx tsc --noEmit` and `npx tsx scripts/socket-smoke.ts` (against a running dev server).

## License

Private — all rights reserved.
