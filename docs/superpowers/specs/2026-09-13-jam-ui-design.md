# Jam UI: Home + Stream Room

**Date:** 2026-09-13 · **Status:** Approved (in-chat) · **Project:** muzi
Transport backend provided by `2026-09-13-websockets-realtime-design.md`.

## Goal

Build the full first-pass UI for the jam application: a home dashboard
(create/join/list sessions) and a stream room (player, queue, upvotes,
participants) in a dark-first "jam-room" visual direction. Queue, upvotes,
and playback ride the socket transport built earlier.

## Screens

### Home (`/`)

Server component; `requireAuth()`.

- **Header:** "muzi" wordmark, user avatar dropdown; logout via existing
  `LogoutButton` behavior (visually wrapped).
- **Create session card:** segmented toggle (`Youtube` / `Spotify`) →
  `POST { type }` to `/api/stream` → router push to `/stream/[id]`.
- **Join session card:** invite-code input → `POST /api/stream/join`
  (server returns the stream id) → push to `/stream/[id]`; invalid code →
  inline error.
- **Your sessions grid** (server-rendered via Prisma):
  participants-less stream cards with type badge, active pill
  (Active/Ended), invite code + copy chip, Open button (and End action for
  the active ones).

### Stream room (`/stream/[streamId]`)

Server page: `requireAuth()`, then loads stream + participants + queue +
caller's upvote map via Prisma. Access:

- Non-participant **and** non-owner gets a "Join this session" gate that
  hits `POST /api/stream/join?code=<stream.code>` then re-renders.
- Stream inactive → read-only banner.
- `isOwner` flag flows client-side to gate playback controls.

Layout: two-column (`lg:`), stacked on mobile.

**Left column**

- Header row: invite code (copy chip) + route back link.
- Player card: current song title/artist/thumbnail; embeds YouTube IFrame
  API player (`https://www.youtube.com/iframe_api` loaded lazily) whenever
  `source=Youtube`; Spotify current → external link chip. Status pill
  (Playing/Paused) driven by `playback:state`.
- Owner-only controls: previous-ish = play/pause + next (uses
  `SocketEvents.PlaybackControl`). YT player calls swapped via its API.
- Participants: avatar list (image fallback initial), owner badge.

**Right column (queue)**

- Add-music form: URL + optional title/artist inputs → `POST /api/music` →
  optimistic append; actual ordering handled by the socket.
- Queue list: rows = thumbnail, title/artist(s), vote pill, upvote button
  (filled when caller voted). Press state initialized from server data,
  flipped optimistically, corrected via ack. `queue:updated` is the only
  source of order/votes after mount.

Non-YouTube queue items never attempt to embed (link chip instead).

## Realtime integration

- Mount → `emitWithAck(StreamJoin)` → snapshot (`{queue, playback}`);
  unmount → `StreamLeave`.
- `QueueUpdated` → re-render order + votes.
- `PlaybackState` → status pill + YT player pause/play/next swap.
- Fail ack → sonner toast (client module).

## Visual direction (dark jam-room)

- Theme locked to dark via `next-themes` `ThemeProvider`
  (`attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`).
- Background ≈ `oklch(0.11 0.005 263)`, elevated cards w/ 1px
  `border-white/10`; inner glow not overdone.
- Accent: **violet** (`oklch(0.70 0.25 296)` ≈ `#b78aff` family)
  interactive; **amber** for "current" glow markers.
- Cards: radius `--radius-xl`, muted headers w/ uppercase micro-labels.
- Route metadata: `title: "muzi"`; logo: `/logo.svg` reuse.

## Components (modules/music convention)

| File | Role |
|---|---|
| `modules/music/components/home/createSessionCard.tsx` | client, create form |
| `modules/music/components/home/joinSessionCard.tsx` | client, join form |
| `modules/music/components/home/streamGrid.tsx` | server-rendered grid |
| `modules/music/components/room/roomPageClient.tsx` | client root wiring socket |
| `modules/music/components/room/playerCard.tsx` | player + owner controls |
| `modules/music/components/room/participantsCard.tsx` | avatar list |
| `modules/music/components/room/queueCard.tsx` | add form + queue |
| `modules/music/components/room/queueRow.tsx` | one queue item |
| `modules/music/components/room/joinGate.tsx` | join-by-code gate |
| `modules/music/components/homePage.tsx` | replaces stub |
| `lib/youtube.ts` | tiny `youtubeVideoId(url)` helper |
| `hooks/use-socket.ts` | default client socket hook (`getSocket`) |

Server page: `app/stream/[streamId]/page.tsx`.
Home page unchanged (`/`), renders new module composition.

## Error states

- Empty queue: friendly empty state card.
- No participation: join gate as above.
- `/api/music` rejects → toast + rollback optimistic insert.
- Owned-only controls: hidden for non-owners (never appear).

## Testing / verification

- `npx tsc --noEmit`, `npx eslint`, `next build`.
- Manual smoke via dev server + browser (webapp-testing skill optional for
  screenshot checks).

## Out of scope

- Presence counts, chat, in-page search of queued songs (beyond code copy).
- Spotify embed (link-out only).
- Light theme design (dark locked).
