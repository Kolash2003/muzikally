/**
 * Manual smoke test for the socket layer.
 * Run `npm run dev` first, then:
 *   npx tsx scripts/socket-smoke.ts
 * For the full authorization flow, pass real session cookies:
 *   OWNER_COOKIE="..." LISTENER_COOKIE="..." SOCKET_STREAM="<streamId>" SOCKET_MUSIC="<musicId>" \
 *   npx tsx scripts/socket-smoke.ts
 */
import { io, type Socket } from "socket.io-client";
import {
  SocketEvents,
  type Ack,
  type PlaybackStatePayload,
  type QueueEntry,
} from "../lib/socket-events";

const url = process.env.SOCKET_URL ?? "http://localhost:3000";
const streamId = process.env.SOCKET_STREAM;
const musicId = process.env.SOCKET_MUSIC;
const ownerCookie = process.env.OWNER_COOKIE;
const listenerCookie = process.env.LISTENER_COOKIE;

const connect = (cookie?: string): Socket =>
  io(url, cookie ? { extraHeaders: { cookie } } : {});

const waitConnect = (s: Socket): Promise<void> =>
  new Promise((resolve, reject) => {
    s.on("connect", () => resolve());
    s.on("connect_error", (err) => reject(err));
  });

const emitAck = <T>(
  s: Socket,
  event: string,
  payload?: unknown,
): Promise<Ack<T>> => s.timeout(5000).emitWithAck(event, payload);

async function main() {
  // 1. Unauthenticated connections must be rejected.
  const anon = connect();
  try {
    await waitConnect(anon);
    console.log("FAIL  anonymous connection was accepted");
    anon.close();
  } catch (error) {
    console.log(`OK    anonymous rejected: ${(error as Error).message}`);
  }

  if (!ownerCookie || !listenerCookie) {
    console.log("SKIP  full flow: OWNER_COOKIE / LISTENER_COOKIE not set");
    return;
  }
  if (!streamId) {
    console.log("SKIP  full flow: SOCKET_STREAM (streamId) not set");
    return;
  }

  // 2. Both users connect and join the stream room.
  const owner = connect(ownerCookie);
  const listener = connect(listenerCookie);
  await Promise.all([waitConnect(owner), waitConnect(listener)]);
  console.log("OK    both users connected");

  const joinOwner = await emitAck(owner, SocketEvents.StreamJoin, { streamId });
  const joinListener = await emitAck(listener, SocketEvents.StreamJoin, {
    streamId,
  });
  console.log(joinOwner.success && joinListener.success ? "OK    joined" : "FAIL  join");
  if (!joinOwner.success || !joinListener.success) process.exit(1);

  // 3. Queue + playback snapshots arrive on join.
  interface JoinData {
    queue: QueueEntry[];
    playback?: PlaybackStatePayload;
  }
  const qO = (joinOwner.data as JoinData).queue;
  console.log(`OK    initial queue: ${qO.length} entries`);

  // 4. Listener upvotes, owner receives the broadcast.
  const target = musicId ?? qO[0]?.musicId;
  if (target) {
    const onQueue = new Promise<void>((resolve) => {
      owner.on(SocketEvents.QueueUpdated, () => resolve());
    });
    const toggle = await emitAck(listener, SocketEvents.UpvoteToggle, {
      streamId,
      musicId: target,
    });
    console.log(toggle.success ? "OK    toggle succeeded" : `FAIL  ${toggle.message}`);
    const raced = await Promise.race([
      onQueue.then(() => "broadcast"),
      new Promise<string>((r) => setTimeout(() => r("timeout"), 6000)),
    ]);
    console.log(raced === "broadcast" ? "OK    queue broadcast received" : "FAIL  no broadcast");
  } else {
    console.log("SKIP  toggle: no music in queue");
  }

  // 5. Listener must NOT control playback.
  const denied = await emitAck(listener, SocketEvents.PlaybackControl, {
    streamId,
    action: "pause",
  });
  console.log(
    !denied.success ? `OK    non-owner denied ("${denied.message}")` : "FAIL  non-owner controlled playback",
  );

  // 6. Owner CAN control playback; broadcast reaches the listener.
  const onState = new Promise<void>((resolve) => {
    listener.on(SocketEvents.PlaybackState, () => resolve());
  });
  const played = await emitAck(owner, SocketEvents.PlaybackControl, {
    streamId,
    action: "pause",
  });
  console.log(played.success ? "OK    owner paused" : `FAIL  ${played.message}`);
  const raced2 = await Promise.race([
    onState.then(() => "broadcast"),
    new Promise<string>((r) => setTimeout(() => r("timeout"), 6000)),
  ]);
  console.log(raced2 === "broadcast" ? "OK    playback broadcast received" : "FAIL  no broadcast");

  owner.close();
  listener.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
