<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Realtime layer (socket.io)

This app runs on a custom server (`server.ts`, root) — `npm run dev` executes `tsx server.ts`, which serves both Next.js HTTP and socket.io websockets on one Node process. Do not revert the `dev`/`start` scripts back to plain `next dev`.

Socket code lives in `/lib`:

- `lib/socket-events.ts` — event names + payload types, shared by client and server. Change events here, then update both ends.
- `lib/socket.ts` — server bootstrap `createSocketServer(httpServer)`; auth via better-auth session read from handshake cookie; authorization: playback control is owner-only, upvotes require stream membership.
- `lib/upvote-service.ts` — upvote write-through cache (Postgres source of truth + Redis sorted set `stream:{id}:queue`), cache-aside queue reads, Redis key helpers (`queueKey`, `stateKey`, `metaKey`, `STREAM_TTL`).
- `lib/socket-client.ts` — browser singleton for client components (`getSocket`, `emitWithAck`).

Verify changes with `npx tsc --noEmit`, `npx eslint`, `next build`, and `npx tsx scripts/socket-smoke.ts` against a running dev server.

Design spec: `docs/superpowers/specs/2026-09-13-websockets-realtime-design.md`.
