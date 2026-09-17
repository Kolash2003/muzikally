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

## 🛠️ Tech Stack

<p align="left">
  <a href="https://nextjs.org/"><img src="https://skillicons.dev/icons?i=nextjs,react,ts,nodejs,postgres,prisma,redis,tailwind,docker,git&theme=dark" alt="Tech stack icons" /></a>
</p>

<p align="left">
  <img src="https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Upstash_Redis-D82C20?style=for-the-badge&logo=redis&logoColor=white" alt="Upstash Redis" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/shadcn/ui-000000?style=for-the-badge&logo=shadcnui&logoColor=white" alt="shadcn/ui" />
  <img src="https://img.shields.io/badge/better--auth-FF6B6B?style=for-the-badge&logo=auth0&logoColor=white" alt="better-auth" />
</p>

| Category | Technologies |
| --- | --- |
| ⚛️ **Frontend** | ![Next.js](https://img.shields.io/badge/-Next.js_16_App_Router-black?logo=next.js) ![React](https://img.shields.io/badge/-React_19-20232A?logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white) ![RSC](https://img.shields.io/badge/-React_Server_Components-149ECA) |
| ⚙️ **Backend** | ![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white) ![Custom Server](https://img.shields.io/badge/-Custom_Server_(server.ts)-000000) ![Zod](https://img.shields.io/badge/-Zod-3E67B1) |
| 🔌 **Realtime** | ![socket.io](https://img.shields.io/badge/-socket.io_4.x-010101?logo=socket.io&logoColor=white) ![WebSockets](https://img.shields.io/badge/-WebSockets-4A4A4A) |
| 🗄️ **Database & Cache** | ![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-4169E1?logo=postgresql&logoColor=white) ![Prisma](https://img.shields.io/badge/-Prisma_7-2D3748?logo=prisma&logoColor=white) ![Redis](https://img.shields.io/badge/-Upstash_Redis-D82C20?logo=redis&logoColor=white) |
| 🔐 **Auth** | ![better-auth](https://img.shields.io/badge/-better--auth-FF6B6B) ![Google OAuth](https://img.shields.io/badge/-Google_OAuth-4285F4?logo=google&logoColor=white) |
| 🎨 **UI / Styling** | ![Tailwind](https://img.shields.io/badge/-Tailwind_CSS_v4-06B6D4?logo=tailwindcss&logoColor=white) ![shadcn](https://img.shields.io/badge/-shadcn/ui-000000) ![Outfit](https://img.shields.io/badge/-Outfit_Font-8B5CF6) ![Lucide](https://img.shields.io/badge/-Lucide_Icons-F56565) ![Sonner](https://img.shields.io/badge/-Sonner-FBBF24) |
| 🧰 **Tooling & DX** | ![ESLint](https://img.shields.io/badge/-ESLint-4B32C3?logo=eslint&logoColor=white) ![tsx](https://img.shields.io/badge/-tsx-FFCB05) ![Prisma Seed](https://img.shields.io/badge/-Seed_MUZI--JAM-2D3748) |
| 🚀 **Deploy** | ![Railway](https://img.shields.io/badge/-Railway-0B0D0E?logo=railway&logoColor=white) ![Render](https://img.shields.io/badge/-Render-46E3B7?logo=render&logoColor=black) ![Fly.io](https://img.shields.io/badge/-Fly.io-7C3AED?logo=flydotio&logoColor=white) ⚠️ _Not Vercel — needs long-lived Node for sockets_ |

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
