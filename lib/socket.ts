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
  type PlaybackStatePayload,
  type PlaybackStatus,
  type QueueUpdatedPayload,
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
    const cached = await redis.hgetall<{ userId: string; active: string }>(
      metaKey(streamId),
    );
    if (cached?.userId) {
      return { userId: cached.userId, active: cached.active === "true" };
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
  if (!stream?.active) throw new Error("stream not available");
  if (stream.userId === userId) return;
  const participation = await prisma.participation.findUnique({
    where: { streamId_userId: { streamId, userId } },
    select: { id: true },
  });
  if (!participation) throw new Error("not a participant of this stream");
}

/* ---------- playback state helpers ---------- */

async function getPlaybackState(
  streamId: string,
): Promise<PlaybackStatePayload> {
  try {
    const state = await redis.hgetall<{ status: PlaybackStatus; musicId?: string }>(
      stateKey(streamId),
    );
    if (state?.status) {
      return {
        streamId,
        status: state.status,
        musicId: state.musicId || undefined,
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
    await redis.hset(stateKey(streamId), {
      status,
      ...(musicId ? { musicId } : {}),
    });
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

/* ---------- server bootstrap ---------- */

export function createSocketServer(
  httpServer: HttpServer,
): SocketIOServer {
  const io = new SocketIOServer(httpServer);

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
          socket.join(roomName(payload.streamId));
          ack(
            ok({
              queue: await getQueue(payload.streamId),
              playback: await getPlaybackState(payload.streamId),
            }),
          );
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
          const queue = await toggleUpvote(
            payload.streamId,
            payload.musicId,
            user.id,
          );
          const body: QueueUpdatedPayload = {
            streamId: payload.streamId,
            queue,
          };
          io.to(roomName(payload.streamId)).emit(SocketEvents.QueueUpdated, body);
          ack(ok(queue));
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
          const current = await prisma.music.findFirst({
            where: { streamId, current: true },
            select: { id: true },
          });
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
