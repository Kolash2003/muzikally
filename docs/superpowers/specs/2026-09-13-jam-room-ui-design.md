# Jam Room UI + Home Dashboard — Design Spec

Date: 2026-09-13
Status: Approved
Companion spec: `2026-09-13-websockets-realtime-design.md`

## Goal

Complete the user-facing UI of muzi: a polished home dashboard and the full
jam room (`/stream/[id]`) where participants add songs, upvote the queue, and
listen together via an embedded YouTube player, all in realtime over the
existing socket.io layer.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Scope | Home dashboard + jam room. Sign-in page untouched. |
| Playback model | Embedded YouTube iframe player in the room, synced via `playback:state`. |
| Add-song UX | Paste URL → metadata auto-resolved (oEmbed) → preview → add. |
| Room layout | Header on top; left column player, right column queue; stacks on mobile. |
| Controls for members | Visible but disabled, with "host controls playback" hint. |
| Visual direction | Elevated music-app energy: ambient thumbnail glow, animated equalizer, smooth states. Dark purple theme kept. |
| Session end | New `stream:ended` socket event → in-room "ended" screen with read-only final queue. |
| Architecture | Pure socket authority for the room: shell render, then join ack hydrates all state. |

## Architecture

### Room data flow (pure socket authority)

1. `app/stream/[id]/page.tsx` (server): `requireAuth()`, render `<RoomClient streamId>` with a connecting skeleton.
2. Client mounts → `getSocket()` → `stream:join` with ack. Ack hydrates everything:
   ```ts
   interface StreamJoinAckData {
     you: { id: string; isOwner: boolean };
     stream: { id: string; code: string; type: "Youtube" | "Spotify"; active: boolean; ownerName: string };
     participants: { id: string; name: string; image: string | null; isOwner: boolean }[];
     queue: EnrichedQueueEntry[];
     playback: PlaybackStatePayload;
     myUpvotes: string[]; // musicIds
   }
   ```
3. Live updates: `queue:updated` (enriched queue), `playback:state`, `stream:ended`, `error`.
4. Ended streams are joinable read-only: ack has `stream.active = false`; vote/add attempts fail server-side and the UI shows the ended screen anyway.

### Why not server-side initial data

Chosen by the product owner (Approach C): one data path, no hydration
mismatch between server-fetched and socket-pushed queue shapes. Cost: a
connecting skeleton on first paint — acceptable.

## Backend changes

### `lib/socket-events.ts`

- Enrich `QueueEntry`:
  ```ts
  interface QueueEntry {
    musicId: string; votes: number;
    title: string; artist: string | null;
    thumbnailUrl: string | null; durationSeconds: number | null;
    source: "Youtube" | "Spotify";
    addedByName: string; current: boolean;
  }
  ```
- Add `StreamEnded: "stream:ended"` (server → room) + payload `{ streamId: string }`.
- Add `StreamJoinAckData`, `ParticipantInfo`, `UpvoteToggleAckData { queue, upvoted }`.

### `lib/upvote-service.ts`

- `getQueue()` returns enriched entries: after obtaining ordered `(id, votes)`
  pairs (Redis or DB hydrate), batch-fetch music rows + adder name, preserve
  vote order, drop ids whose music row vanished.
- Redis sorted set still stores only `musicId → votes` (no format change).

### `lib/socket.ts`

- `stream:join`: allow ended streams (read-only); build full ack (participants
  include owner even without a `Participation` row; `myUpvotes` from Postgres).
- `upvote:toggle` ack → `{ queue, upvoted }`.
- Export `broadcastStreamEnded(streamId)`: emits `stream:ended` to the room and
  deletes `metaKey`/`stateKey`/`queueKey` (fixes stale `active: true` meta cache).

### REST routes

- `PATCH /api/stream`: after ending, call `broadcastStreamEnded`.
- `POST /api/music`: accept optional `thumbnailUrl`; reject URLs whose source
  doesn't match the stream type (YouTube room ↔ YouTube links).
- New `GET /api/music/resolve?url=`: oEmbed lookup
  (`youtube.com/oembed`, `open.spotify.com/oembed`), returns
  `{ title, artist, thumbnailUrl, source }`. No API key. 400 on bad/unsupported URL.

## Frontend

### Home (`/`)

`homePage.tsx` (server component) becomes the dashboard: header (wordmark,
avatar + logout dropdown), greeting, `CreateSessionCard` + `JoinSessionCard`
side by side, then "Your sessions" `StreamGrid` fed by a direct Prisma query
(streams owned or participated in, newest first, with role).

### Jam room (`/stream/[id]`)

Components under `modules/music/components/room/`:

- `room-client.tsx` — phase machine `connecting → live | ended | not-found | not-a-member`; layout grid; wires `useRoomSocket`.
- `room-header.tsx` — invite-code chip (click-to-copy), participants avatar stack + popover (owner crowned), Leave; End (owner, `AlertDialog` confirm).
- `player-panel.tsx` — ambient glow (blurred thumbnail behind card), `YoutubePlayer`, now-playing metadata, controls (owner enabled / member disabled + hint). Spotify-type rooms: queue works, player area shows "Spotify playback isn't supported in-app yet".
- `youtube-player.tsx` — IFrame API wrapper (script loaded once); imperative API `load(videoId)`, `play()`, `pause()`; reports natural end (owner → `playback:control next`). Autoplay-block fallback: "tap to enable audio" overlay.
- `add-song.tsx` — URL input, debounced resolve, preview card, submit → toast.
- `queue-panel.tsx` / `queue-item.tsx` — current track pinned with animated equalizer bars; rest sorted by votes; toggle button with count; thumbnail, title, artist, duration, added-by. Read-only in ended phase.
- `room-states.tsx` — connecting skeleton, ended screen (final queue read-only + back home), not-found, not-a-member (code entry → `/api/stream/join` → retry socket join).

Hook: `hooks/use-room-socket.ts` — join/leave lifecycle, subscriptions,
actions (`toggleUpvote`, `playbackControl`), reconnect-safe (re-join on
`connect`, socket singleton already handled by `lib/socket-client.ts`).

### Visual language

Existing dark purple theme kept. Energy comes from: ambient blurred-thumbnail
glow behind the player, equalizer-bar animation on the playing track,
skeletons instead of spinners, sonner toasts for async feedback. No new
dependencies.

## Error handling

- Socket ack failures → inline screen (join) or toast (toggle/control).
- Resolve failures → inline hint under the URL input.
- Socket `error` event → toast.
- Reconnect → automatic re-join + re-hydrate.

## Testing / verification

- `npx tsc --noEmit`, `npx eslint`, `next build`.
- `npx tsx scripts/socket-smoke.ts` against the running dev server.
- Manual: two-browser room (owner + member) — add, vote, play/pause/next, end.

## Out of scope

- Seek/position sync (`positionSeconds` stays reserved).
- Spotify playback (queue/vote works; no in-app audio).
- Presence ("who is online right now").
- Chat.
