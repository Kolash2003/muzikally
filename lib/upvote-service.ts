import { prisma } from "./db";
import { redis } from "./redis";
import type { QueueEntry } from "./socket-events";

export const STREAM_TTL = 60 * 60 * 24; // 24h

export const queueKey = (streamId: string) => `stream:${streamId}:queue`;
export const stateKey = (streamId: string) => `stream:${streamId}:state`;
export const metaKey = (streamId: string) => `stream:${streamId}:meta`;

/**
 * Ordered queue snapshot for a stream, cache-aside: reads the Redis sorted
 * set; on a miss (or empty set) hydrates from Postgres and warms the cache.
 * Falls back to a direct Postgres read when Redis is unavailable.
 */
export async function getQueue(streamId: string): Promise<QueueEntry[]> {
  const key = queueKey(streamId);
  try {
    const raw = await redis.zrange<(string | number)[]>(key, 0, -1, {
      withScores: true,
      rev: true,
    });
    if (raw.length > 0) {
      return parseZRangePairs(raw);
    }
  } catch (error) {
    console.error(`[upvote] redis zrange failed for ${key}:`, error);
  }
  return hydrateQueueFromDb(streamId);
}

/** Sort descending by votes. Raw format alternates [member, score, ...]. */
function parseZRangePairs(raw: (string | number)[]): QueueEntry[] {
  const entries: QueueEntry[] = [];
  for (let i = 0; i < raw.length - 1; i += 2) {
    entries.push({
      musicId: String(raw[i]),
      votes: Number(raw[i + 1] ?? 0),
    });
  }
  return entries;
}

async function hydrateQueueFromDb(streamId: string): Promise<QueueEntry[]> {
  const [grouped, musics] = await Promise.all([
    prisma.upvote.groupBy({
      by: ["musicId"],
      where: { music: { streamId, played: false } },
      _count: true,
    }),
    prisma.music.findMany({
      where: { streamId, played: false },
      select: { id: true },
    }),
  ]);
  const counts = new Map(grouped.map((g) => [g.musicId, Number(g._count)]));
  const entries: QueueEntry[] = musics.map((m) => ({
    musicId: m.id,
    votes: counts.get(m.id) ?? 0,
  }));
  entries.sort((a, b) => b.votes - a.votes);
  // Warm the cache (best-effort).
  try {
    if (entries.length > 0) {
      const pairs = entries.map((e) => ({
        score: e.votes,
        member: e.musicId,
      }));
      await redis.zadd(queueKey(streamId), pairs[0], ...pairs.slice(1));
      await redis.expire(queueKey(streamId), STREAM_TTL);
    }
  } catch (error) {
    console.error(`[upvote] redis hydrate failed for ${streamId}:`, error);
  }
  return entries;
}

/**
 * Write-through upvote toggle.
 * Postgres is the source of truth and is written first; the Redis sorted
 * set mirrors the delta atomically. Returns the fresh ordered queue.
 */
export async function toggleUpvote(
  streamId: string,
  musicId: string,
  userId: string,
): Promise<QueueEntry[]> {
  // Authorization: caller must be an owner or a participant of the stream.
  const [participant, stream, music] = await Promise.all([
    prisma.participation.findUnique({
      where: { streamId_userId: { streamId, userId } },
      select: { id: true },
    }),
    prisma.stream.findUnique({
      where: { id: streamId },
      select: { userId: true, active: true },
    }),
    prisma.music.findFirst({
      where: { id: musicId, streamId },
      select: { id: true },
    }),
  ]);
  if (!stream?.active) throw new Error("stream not available");
  if (!participant && stream.userId !== userId)
    throw new Error("not a participant of this stream");
  if (!music) throw new Error("music is not in this stream");

  // Postgres first (source of truth).
  const unique = { musicId_userId: { musicId, userId } };
  const existing = await prisma.upvote.findUnique({ where: unique });
  const delta = existing ? -1 : +1;
  if (existing) {
    await prisma.upvote.delete({ where: unique });
  } else {
    await prisma.upvote.create({ data: { musicId, userId } });
  }

  // Redis mirror (best-effort; failures are logged, reads degrade to DB).
  try {
    // Ensure every unplayed music is a member so the snapshot is complete.
    await getQueue(streamId);
    await redis.zincrby(queueKey(streamId), delta, musicId);
    await redis.expire(queueKey(streamId), STREAM_TTL);
  } catch (error) {
    console.error(`[upvote] redis mirror failed for ${musicId}:`, error);
  }

  return getQueue(streamId);
}
