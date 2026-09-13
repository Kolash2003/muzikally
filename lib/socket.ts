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
  type PlaybackStatePayload,
  type PlaybackStatus,
  type QueueUpdatedPayload,
  type StreamEndedPayload,
  type StreamJoinAckData,
  type UpvoteToggleAckData,
} from "./socket-events";
import {
  STREAM_TTL,
  getQueue,
  metaKey,
  queueKey,
  stateKey,
  toggleUpvote,
} from "./upvote-service";

interface SessionUser {
  id: string;
  name: string;
  email: string;
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
  const stream = await getStreamMeta(streamId);
  if (!stream) throw new Error("stream not found");
  if (stream.userId === userId) return;
  const participation = await prisma.participation.findUnique({
    where: { streamId_userId: { streamId, userId } },
    select: { id: true },
  });
  if (!participation) throw new Error("not a participant of this stream");
}

/**
 * Full room hydration for the join ack. Ended streams are joinable
 * read-only (the client renders the ended screen from `stream.active`).
 */
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
    getQueue(streamId),
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
  // Played songs drop out of the queue cache.
  try {
    if (current?.id) {
      await redis.zrem(queueKey(streamId), current.id);
    }
  } catch (error) {
    console.error(`[socket] redis zrem failed for ${streamId}:`, error);
  }
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
 * Invalidate the queue cache and push the fresh ordered queue to the room.
 * Used by REST routes (e.g. POST /api/music after a song is added).
 */
export async function broadcastQueue(streamId: string) {
  const io = getIoInstance();
  if (!io) {
    console.error(`[socket] broadcastQueue skipped: no io instance`);
    return;
  }
  try {
    await redis.del(queueKey(streamId)); // force re-hydration on next read
  } catch (error) {
    console.error(`[socket] queue cache invalidate failed for ${streamId}:`, error);
  }
  const body = { streamId, queue: await getQueue(streamId) };
  io.to(roomName(streamId)).emit(SocketEvents.QueueUpdated, body);
}

/**
 * Notify the room that the stream has ended and drop its cached state.
 * Called by PATCH /api/stream after the DB update.
 */
export async function broadcastStreamEnded(streamId: string) {
  try {
    await Promise.all([
      redis.del(metaKey(streamId)),
      redis.del(stateKey(streamId)),
      redis.del(queueKey(streamId)),
    ]);
  } catch (error) {
    console.error(`[socket] cache cleanup failed for ${streamId}:`, error);
  }
  const io = getIoInstance();
  if (!io) {
    console.error(`[socket] broadcastStreamEnded skipped: no io instance`);
    return;
  }
  const body: StreamEndedPayload = { streamId };
  io.to(roomName(streamId)).emit(SocketEvents.StreamEnded, body);
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
      } satisfies SessionUser;
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
          socket.join(roomName(payload.streamId));
          ack(ok(data));
        } catch (error) {
          ack(fail((error as Error).message));
        }
      },
    );

    socket.on(
      SocketEvents.StreamLeave,
      (payload: { streamId: string }, cb?: unknown) => {
        socket.leave(roomName(payload.streamId));
        ackOf(cb)(ok());
      },
    );

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
          try {
            await redis.zrem(queueKey(streamId), musicId);
          } catch (error) {
            console.error(
              `[socket] redis zrem failed for ${streamId}:`,
              error,
            );
          }
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
