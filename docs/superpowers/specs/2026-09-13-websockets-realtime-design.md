# Realtime Layer: Socket.IO + Redis for Upvotes & Playback

**Date:** 2026-09-13 · **Status:** Approved (in-chat) · **Project:** muzi

## Goal

Add a websocket transport (socket.io) for realtime upvotes and synchronized
playback control, with Redis as a write-through cache for vote counters and
playback state. Authorization is enforced server-side: only the stream owner
may control playback.

## Background (current state)

- Next.js 16.3.4 App Router, Prisma 7 + Postgres, better-auth, `@upstash/redis`
  (client exists in `lib/redis.ts` but is unused).
- Schema already supports the feature: `Upvote` model (`@@unique([musicId, userId])`),
  `Music.played`, `Music.current`, `Stream.userId` (owner), `Participation`.
- No socket.io dependency, no custom server, no upvote/playback API routes.

## Architecture

- **`server.ts`** (repo root, one file): creates `http.Server`, delegates to
  Next's request handler, and attaches socket.io. Not processed by the Next
  bundler — plain Node-compatible TS, executed with `tsx` (new devDependency).
- Package scripts change to:
  - `dev`: `tsx server.ts`
  - `start`: `NODE_ENV=production tsx server.ts`
  - `build`: unchanged (`next build`)
- All socket logic lives under **/lib**:
  - `lib/socket.ts` — server-side bootstrap `createSocketServer(httpServer)`:
    auth middleware, event registration, room helpers.
  - `lib/socket-events.ts` — event-name constants + payload types, shared by
    client and server (single source of truth).
  - `lib/socket-client.ts` — browser wrapper around `socket.io-client`
    (singleton, typed emit/subscribe helpers).
  - `lib/upvote-service.ts` — write-through toggle + ordered queue reads.
  - `lib/redis.ts` — unchanged singleton.

## Event contract

Payload types live in `lib/socket-events.ts`; every client→server emit uses an
ack callback and may also produce an `error` ack payload.

| Direction | Event | Payload | Authorization |
|---|---|---|---|
| C → S | `stream:join` / `stream:leave` | `{streamId}` | session user must be stream owner or a participant |
| C → S | `upvote:toggle` | `{streamId, musicId}` | session user must be a participant of that stream |
| C → S | `playback:control` | `{streamId, action}` where `action ∈ {play, pause, next}` | **owner only**: `stream.userId === session.user.id` |
| S → room `stream:{id}` | `queue:updated` | sorted queue snapshot `[{musicId, votes}]` | — |
| S → room `stream:{id}` | `playback:state` | `{status: playing|paused, musicId?, positionSeconds}` | — |
| S → socket | `error` | `{event, message}` | — |

Room naming: `"stream:{streamId}"`. Clients join/leave rooms via the
`stream:join` / `stream:leave` events; disconnect cleans up automatically.

## Auth on the socket

Handshake carries the browser cookie. Server middleware constructs
`Headers` from `socket.handshake.headers.cookie` and calls
`auth.api.getSession({ headers })`. Unauthenticated sockets are rejected at
connection time. The resolved `session.user` is stored on `socket.data`.

## Write-through cache for upvotes

Data structure: a Redis **sorted set** `stream:{streamId}:queue` member =
`musicId`, score = vote count. TTL set (24h) on stream creation / first join
hydration.

Toggle flow (per `upvote:toggle` event):

1. Server-side checks the session user is a participant of the stream (Prisma).
2. **Postgres first (source of truth):** if `Upvote(musicId, userId)` exists →
   delete (delta −1), else create (delta +1).
3. **Redis mirror:** `ZINCRBY stream:{id}:queue <±1> <musicId>` — atomic,
   no recount race.
4. `ZREVRANGE … WITHSCORES` → broadcast `queue:updated` to the room.

Reads are cache-aside: `stream:join` serves the ZSET; on a Redis miss it
hydrates from Postgres and warms the cache.

## Playback control

- `playback:control` loads the stream (cache-aside Redis hash
  `stream:{id}:meta`, falls back to Prisma) and rejects unless the session user
  is the owner.
- `play` / `pause` → persist status to Redis hash `stream:{id}:state`
  (so late joiners get current state) → broadcast `playback:state`.
- `next` semantics (explicit, chosen in design): mark the currently-playing
  `Music.played = true` / `current = false` in Postgres, then promote the
  **top-voted unplayed** song (ZSET order) to `current = true`, update the
  Redis hash, and broadcast `playback:state`.

## Error handling

- Every client→server emit takes an ack: `{success: true, data?}` or
  `{success: false, message}`; matching `error` event for room-level failures.
- Unauthorized events (non-participant voting, non-owner playback) are
  rejected via ack only — no room noise.
- Redis failures degrade gracefully: reads fall back to Prisma; write-through
  Redis mirror failure logs but doesn't fail the user's toggle (Postgres is
  the truth).

## Testing / verification

No test framework in repo; verification steps:

1. `npx tsc --noEmit` and `npx eslint`
2. `next build` passes
3. `scripts/socket-smoke.ts` — spins two socket.io-clients (owner + listener)
   against a dev server, exercising join, toggle, and owner-vs-non-owner
   playback.

## Explicitly out of scope

- Multi-instance socket.io (Redis pub/sub adapter). Single Node process;
  in-memory rooms suffice. Upstash REST client has no pub/sub anyway.
- Chat, presence counts, rate-limiting — listed as future websocket-friendly
  additions, not built now.
