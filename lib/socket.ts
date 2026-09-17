import type { Server as HttpServer } from "node:http";
import {
  Server as SocketIOServer,
  type Socket,
} from "socket.io";
import { auth } from "./auth";
import { prisma } from "./db";
import { redis } from "./redis";
import {
  SocketEvents,
  roomName,
  type Ack,
  type ParticipantInfo,
  type ParticipantsUpdatedPayload,
  type PlaybackStatePayload,
  type PlaybackStatus,
  type QueueUpdatedPayload,
  type StreamEndedPayload,
  type StreamJoinAckData,
  type UpvoteToggleAckData,
} from "./socket-events";
import {
  STREAM_TTL,
  getAllSongs,
  getQueue,
  metaKey,
  stateKey,
  toggleUpvote,
} from "./upvote-service";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

type StreamMeta = { userId: string; active: boolean };

type AckCallback = (ack: Ack) => void;

const ok = <T>(data?: T): Ack<T> => ({ success: true, data });
const fail = (message: string): Ack => ({ success: false, message });

/* ---------- stream lookup, cache-aside on Redis ---------- */

async function getStreamMeta(streamId: string): Promise<StreamMeta | null> {
  try {
    // Upstash auto-deserializes hash values, so a stored "true" comes back
    // as boolean true — accept both forms (a strict === "true" check would
    // wrongly report every cached stream as ended).
    const cached = await redis.hgetall<{
      userId: string;
      active: string | boolean;
    }>(metaKey(streamId));
    if (cached?.userId) {
      return {
        userId: cached.userId,
        active: cached.active === true || cached.active === "true",
      };
    }
  } catch (error) {
    console.error(`[socket] redis meta read failed for ${streamId}:`, error);
  }
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { userId: true, active: true },
  });
  if (stream) {
    try {
      await redis.hset(metaKey(streamId), {
        userId: stream.userId,
        active: String(stream.active),
      });
      await redis.expire(metaKey(streamId), STREAM_TTL);
    } catch (error) {
      console.error(`[socket] redis meta warm failed for ${streamId}:`, error);
    }
  }
  return stream;
}

async function assertMembership(streamId: string, userId: string) {
  // Always read the active flag from Postgres for joins. Redis metadata is
  // intentionally cached for playback/control, but a stale `active: true`
  // value must never allow a user to re-enter an ended stream.
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { userId: true, active: true },
  });
  if (!stream) throw new Error("stream not found");
  if (!stream.active) throw new Error("stream has ended");
  if (stream.userId === userId) return;
  const participation = await prisma.participation.findUnique({
    where: { streamId_userId: { streamId, userId } },
    select: { id: true },
  });
  if (!participation) throw new Error("not a participant of this stream");
}

/** Full room hydration for the join ack. Ended streams are not joinable. */
async function buildJoinData(
  streamId: string,
  userId: string,
): Promise<StreamJoinAckData> {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: {
      id: true,
      code: true,
      type: true,
      active: true,
      userId: true,
      user: { select: { name: true } },
    },
  });
  if (!stream) throw new Error("stream not found");

  const [participations, myUpvoteRows, queue, playback] = await Promise.all([
    prisma.participation.findMany({
      where: { streamId },
      select: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.upvote.findMany({
      where: { userId, music: { streamId } },
      select: { musicId: true },
    }),
    stream.active ? getQueue(streamId) : getAllSongs(streamId),
    getPlaybackState(streamId),
  ]);

  const participants: ParticipantInfo[] = participations.map((p) => ({
    id: p.user.id,
    name: p.user.name,
    image: p.user.image,
    isOwner: p.user.id === stream.userId,
  }));
  // The owner may have no Participation row; make sure they appear.
  if (!participants.some((p) => p.id === stream.userId)) {
    const owner = await prisma.user.findUnique({
      where: { id: stream.userId },
      select: { id: true, name: true, image: true },
    });
    if (owner) {
      participants.unshift({
        id: owner.id,
        name: owner.name,
        image: owner.image,
        isOwner: true,
      });
    }
  }

  return {
    you: { id: userId, isOwner: stream.userId === userId },
    stream: {
      id: stream.id,
      code: stream.code,
      type: stream.type,
      active: stream.active,
      ownerName: stream.user.name,
    },
    participants,
    queue,
    playback,
    myUpvotes: myUpvoteRows.map((u) => u.musicId),
  };
}

/* ---------- playback state helpers ---------- */

async function getPlaybackState(
  streamId: string,
): Promise<PlaybackStatePayload> {
  try {
    const state = await redis.hgetall<{ status: unknown; musicId?: unknown }>(
      stateKey(streamId),
    );
    if (state?.status === "playing" || state?.status === "paused") {
      const musicId =
        typeof state.musicId === "string" && state.musicId.length > 0
          ? state.musicId
          : undefined;
      return {
        streamId,
        status: state.status,
        musicId,
      };
    }
  } catch (error) {
    console.error(`[socket] redis state read failed for ${streamId}:`, error);
  }
  const current = await prisma.music.findFirst({
    where: { streamId, current: true },
    select: { id: true },
  });
  return { streamId, status: "playing", musicId: current?.id };
}

async function persistPlaybackState(
  streamId: string,
  status: PlaybackStatus,
  musicId?: string,
) {
  try {
    if (musicId) {
      await redis.hset(stateKey(streamId), { status, musicId });
    } else {
      // No track: clear any previously stored musicId so late joiners
      // don't see a ghost "current" song.
      await redis.hset(stateKey(streamId), { status });
      await redis.hdel(stateKey(streamId), "musicId");
    }
    await redis.expire(stateKey(streamId), STREAM_TTL);
  } catch (error) {
    console.error(`[socket] redis state write failed for ${streamId}:`, error);
  }
}

/** Advance to the highest-voted unplayed song. Returns its id or undefined. */
async function advanceToNext(streamId: string): Promise<string | undefined> {
  const queue = await getQueue(streamId);
  const [current, played] = await Promise.all([
    prisma.music.findFirst({
      where: { streamId, current: true },
      select: { id: true },
    }),
    prisma.music.findMany({
      where: { streamId, played: true },
      select: { id: true },
    }),
  ]);
  const playedIds = new Set(played.map((m) => m.id));
  const nextId =
    queue.find((e) => e.musicId !== current?.id && !playedIds.has(e.musicId))
      ?.musicId ?? undefined;
  if (!nextId) return undefined;

  await prisma.$transaction([
    ...(current?.id
      ? [
          prisma.music.update({
            where: { id: current.id },
            data: { played: true, playedAt: new Date(), current: false },
          }),
        ]
      : []),
    prisma.music.update({
      where: { id: nextId },
      data: { current: true },
    }),
  ]);
  return nextId;
}

/**
 * Shared io handle so API routes can broadcast to rooms.
 * Stored on globalThis (not module scope): in dev, server.ts runs through
 * tsx while API routes are bundled by Turbopack, so each gets its own copy
 * of this module — only globalThis is visible to both.
 */
const globalForSocket = globalThis as unknown as {
  socketIoInstance: SocketIOServer | undefined;
};

function getIoInstance(): SocketIOServer | undefined {
  return globalForSocket.socketIoInstance;
}

/**
 * Push the fresh ordered queue to the room.
 * Used by REST routes (e.g. POST /api/music after a song is added).
 */
export async function broadcastQueue(streamId: string) {
  const io = getIoInstance();
  if (!io) {
    console.error(`[socket] broadcastQueue skipped: no io instance`);
    return;
  }
  const body = { streamId, queue: await getQueue(streamId) };
  io.to(roomName(streamId)).emit(SocketEvents.QueueUpdated, body);
}

/** Who is currently connected to this room (socket presence, not membership). */
async function listConnectedParticipants(
  streamId: string,
): Promise<ParticipantInfo[]> {
  const io = getIoInstance();
  if (!io) return [];
  const stream = await getStreamMeta(streamId);
  const sockets = await io.in(roomName(streamId)).fetchSockets();
  const seen = new Map<string, ParticipantInfo>();
  for (const s of sockets) {
    const user = s.data.user as SessionUser | undefined;
    if (!user?.id || seen.has(user.id)) continue;
    seen.set(user.id, {
      id: user.id,
      name: user.name,
      image: user.image,
      isOwner: stream?.userId === user.id,
    });
  }
  return [...seen.values()].sort((a, b) => {
    if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

async function broadcastParticipants(
  streamId: string,
  exceptSocketId?: string,
) {
  const io = getIoInstance();
  if (!io) return;
  const body: ParticipantsUpdatedPayload = {
    streamId,
    participants: await listConnectedParticipants(streamId),
  };
  const target = exceptSocketId
    ? io.to(roomName(streamId)).except(exceptSocketId)
    : io.to(roomName(streamId));
  target.emit(SocketEvents.ParticipantsUpdated, body);
}

/**
 * Notify the room that the stream has ended and drop its cached state.
 * Called by PATCH /api/stream after the DB update.
 */
export async function broadcastStreamEnded(streamId: string) {
  const history = await getAllSongs(streamId);
  try {
    await Promise.all([
      redis.del(metaKey(streamId)),
      redis.del(stateKey(streamId)),
    ]);
  } catch (error) {
    console.error(`[socket] cache cleanup failed for ${streamId}:`, error);
  }
  const io = getIoInstance();
  if (!io) {
    console.error(`[socket] broadcastStreamEnded skipped: no io instance`);
    return;
  }
  io.to(roomName(streamId)).emit(SocketEvents.QueueUpdated, {
    streamId,
    queue: history,
  });
  // Ended is broadcast globally (not just the room): clients outside the
  // room — e.g. the dashboard list — must also flip to the ended state.
  const body: StreamEndedPayload = { streamId };
  io.emit(SocketEvents.StreamEnded, body);
}

/* ---------- server bootstrap ---------- */

export function createSocketServer(
  httpServer: HttpServer,
): SocketIOServer {
  const io = new SocketIOServer(httpServer);
  globalForSocket.socketIoInstance = io;

  // Session gate: reject unauthenticated connections at handshake time.
  io.use(async (socket, next) => {
    try {
      const cookie = socket.handshake.headers.cookie;
      if (!cookie) return next(new Error("unauthorized"));
      const session = await auth.api.getSession({
        headers: new Headers({ cookie }),
      });
      if (!session?.user) return next(new Error("unauthorized"));
      socket.data.user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      } satisfies SessionUser;
      socket.data.joinedStreams = new Set<string>();
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as SessionUser;
    const ackOf = (cb: unknown): AckCallback =>
      typeof cb === "function"
        ? (cb as AckCallback)
        : () => undefined;

    /* -- room membership -- */

    socket.on(
      SocketEvents.StreamJoin,
      async (payload: { streamId: string }, cb?: unknown) => {
        const ack = ackOf(cb);
        try {
          await assertMembership(payload.streamId, user.id);
          const data = await buildJoinData(payload.streamId, user.id);
          // Prevent a join that races with the host ending the stream.
          if (!data.stream.active) throw new Error("stream has ended");
          socket.join(roomName(payload.streamId));
          (socket.data.joinedStreams as Set<string>).add(payload.streamId);
          data.participants = await listConnectedParticipants(payload.streamId);
          ack(ok(data));
          void broadcastParticipants(payload.streamId, socket.id);
        } catch (error) {
          ack(fail((error as Error).message));
        }
      },
    );

    socket.on(
      SocketEvents.StreamLeave,
      (payload: { streamId: string }, cb?: unknown) => {
        socket.leave(roomName(payload.streamId));
        (socket.data.joinedStreams as Set<string> | undefined)?.delete(
          payload.streamId,
        );
        ackOf(cb)(ok());
        void broadcastParticipants(payload.streamId);
      },
    );

    socket.on("disconnect", () => {
      const joined = socket.data.joinedStreams as Set<string> | undefined;
      if (!joined?.size) return;
      for (const id of joined) void broadcastParticipants(id);
    });

    /* -- upvotes: write-through toggle -- */

    socket.on(
      SocketEvents.UpvoteToggle,
      async (payload: { streamId: string; musicId: string }, cb?: unknown) => {
        const ack = ackOf(cb);
        try {
          const { queue, upvoted } = await toggleUpvote(
            payload.streamId,
            payload.musicId,
            user.id,
          );
          const body: QueueUpdatedPayload = {
            streamId: payload.streamId,
            queue,
          };
          io.to(roomName(payload.streamId)).emit(SocketEvents.QueueUpdated, body);
          const data: UpvoteToggleAckData = { queue, upvoted };
          ack(ok(data));
        } catch (error) {
          ack(fail((error as Error).message));
        }
      },
    );

    /* -- queue removal: owner-only -- */

    socket.on(
      SocketEvents.QueueRemove,
      async (payload: { streamId: string; musicId: string }, cb?: unknown) => {
        const ack = ackOf(cb);
        try {
          const { streamId, musicId } = payload;
          const stream = await getStreamMeta(streamId);
          if (!stream) {
            ack(fail("stream not found"));
            return;
          }
          if (stream.userId !== user.id) {
            ack(fail("only the host can remove songs"));
            return;
          }
          if (!stream.active) {
            ack(fail("stream has ended"));
            return;
          }
          const music = await prisma.music.findFirst({
            where: { id: musicId, streamId },
            select: { id: true, current: true },
          });
          if (!music) {
            ack(fail("song is not in this queue"));
            return;
          }
          const wasCurrent = music.current;
          // Upvote rows cascade from the music delete (schema onDelete).
          await prisma.music.delete({ where: { id: musicId } });
          if (wasCurrent) {
            // The removed song was playing: stop everywhere. The owner can
            // press Play to start the top of the remaining queue.
            await persistPlaybackState(streamId, "paused");
            const state: PlaybackStatePayload = {
              streamId,
              status: "paused",
            };
            io.to(roomName(streamId)).emit(SocketEvents.PlaybackState, state);
          }
          const updated: QueueUpdatedPayload = {
            streamId,
            queue: await getQueue(streamId),
          };
          io.to(roomName(streamId)).emit(SocketEvents.QueueUpdated, updated);
          ack(ok({ queue: updated.queue }));
        } catch (error) {
          ack(fail((error as Error).message));
        }
      },
    );

    /* -- playback: owner-only control -- */

    socket.on(
      SocketEvents.PlaybackControl,
      async (
        payload: { streamId: string; action: "play" | "pause" | "next" },
        cb?: unknown,
      ) => {
        const ack = ackOf(cb);
        try {
          const { streamId, action } = payload;
          const stream = await getStreamMeta(streamId);
          if (!stream) {
            ack(fail("stream not found"));
            return;
          }
          if (stream.userId !== user.id) {
            ack(fail("playback control is owner-only"));
            return;
          }
          if (!stream.active) {
            ack(fail("stream has ended"));
            return;
          }
          if (action === "next") {
            const nextId = await advanceToNext(streamId);
            await persistPlaybackState(
              streamId,
              nextId ? "playing" : "paused",
              nextId,
            );
            const body: PlaybackStatePayload = {
              streamId,
              status: nextId ? "playing" : "paused",
              musicId: nextId,
            };
            io.to(roomName(streamId)).emit(SocketEvents.PlaybackState, body);
            // The queue changed (the played song dropped out).
            const updated: QueueUpdatedPayload = {
              streamId,
              queue: await getQueue(streamId),
            };
            io.to(roomName(streamId)).emit(SocketEvents.QueueUpdated, updated);
            ack(ok());
            return;
          }
          const status: PlaybackStatus =
            action === "play" ? "playing" : "paused";
          let current = await prisma.music.findFirst({
            where: { streamId, current: true },
            select: { id: true },
          });
          if (action === "play" && !current) {
            // Nothing designated yet — start the top of the queue so Play
            // always does something sensible when songs are queued.
            const nextId = await advanceToNext(streamId);
            if (nextId) {
              current = { id: nextId };
              const updated: QueueUpdatedPayload = {
                streamId,
                queue: await getQueue(streamId),
              };
              io.to(roomName(streamId)).emit(
                SocketEvents.QueueUpdated,
                updated,
              );
            }
          }
          await persistPlaybackState(streamId, status, current?.id);
          const body: PlaybackStatePayload = {
            streamId,
            status,
            musicId: current?.id,
          };
          io.to(roomName(streamId)).emit(SocketEvents.PlaybackState, body);
          ack(ok());
        } catch (error) {
          ack(fail((error as Error).message));
        }
      },
    );
  });

  return io;
}
