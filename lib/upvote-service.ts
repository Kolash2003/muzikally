import { prisma } from "./db";
import type { QueueEntry } from "./socket-events";

export const STREAM_TTL = 60 * 60 * 24; // 24h

export const stateKey = (streamId: string) => `stream:${streamId}:state`;
export const metaKey = (streamId: string) => `stream:${streamId}:meta`;

/**
 * Ordered queue snapshot for a stream, read straight from Postgres
 * (the source of truth): all unplayed songs ordered by vote count,
 * enriched with music metadata (title, thumbnail, adder, …).
 */
export async function getQueue(streamId: string): Promise<QueueEntry[]> {
  const pairs = await hydrateQueueFromDb(streamId);
  return enrichQueueEntries(pairs);
}

export async function getAllSongs(streamId: string): Promise<QueueEntry[]> {
  const musics = await prisma.music.findMany({
    where: { streamId },
    select: {
      id: true,
      title: true,
      artist: true,
      url: true,
      thumbnailUrl: true,
      durationSeconds: true,
      source: true,
      current: true,
      played: true,
      user: { select: { name: true } },
      _count: { select: { upvotes: true } },
    },
  });
  const entries: QueueEntry[] = musics.map((m) => ({
    musicId: m.id,
    votes: m._count.upvotes,
    title: m.title,
    artist: m.artist,
    url: m.url,
    thumbnailUrl: m.thumbnailUrl,
    durationSeconds: m.durationSeconds,
    source: m.source,
    addedByName: m.user.name,
    current: m.current,
    played: m.played,
  }));
  entries.sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    if (a.played !== b.played) return a.played ? 1 : -1;
    return b.votes - a.votes || a.title.localeCompare(b.title);
  });
  return entries;
}

/** Attach music metadata to ordered `(musicId, votes)` pairs, preserving order. */
async function enrichQueueEntries(
  pairs: { musicId: string; votes: number }[],
): Promise<QueueEntry[]> {
  if (pairs.length === 0) return [];
  const musics = await prisma.music.findMany({
    where: { id: { in: pairs.map((p) => p.musicId) } },
    select: {
      id: true,
      title: true,
      artist: true,
      url: true,
      thumbnailUrl: true,
      durationSeconds: true,
      source: true,
      current: true,
      played: true,
      user: { select: { name: true } },
    },
  });
  const byId = new Map(musics.map((m) => [m.id, m]));
  const entries: QueueEntry[] = [];
  for (const pair of pairs) {
    const music = byId.get(pair.musicId);
    if (!music) continue; // row deleted since the score was written
    entries.push({
      musicId: music.id,
      votes: pair.votes,
      title: music.title,
      artist: music.artist,
      url: music.url,
      thumbnailUrl: music.thumbnailUrl,
      durationSeconds: music.durationSeconds,
      source: music.source,
      addedByName: music.user.name,
      current: music.current,
      played: music.played,
    });
  }
  return entries;
}

async function hydrateQueueFromDb(
  streamId: string,
): Promise<{ musicId: string; votes: number }[]> {
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
  const entries = musics.map((m) => ({
    musicId: m.id,
    votes: counts.get(m.id) ?? 0,
  }));
  entries.sort((a, b) => b.votes - a.votes);
  return entries;
}

/**
 * Upvote toggle.
 * Postgres is the source of truth. Returns the fresh ordered queue plus
 * the caller's resulting vote state.
 */
export async function toggleUpvote(
  streamId: string,
  musicId: string,
  userId: string,
): Promise<{ queue: QueueEntry[]; upvoted: boolean }> {
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

  const unique = { musicId_userId: { musicId, userId } };
  const existing = await prisma.upvote.findUnique({ where: unique });
  const delta = existing ? -1 : +1;
  if (existing) {
    await prisma.upvote.delete({ where: unique });
  } else {
    await prisma.upvote.create({ data: { musicId, userId } });
  }

  return { queue: await getQueue(streamId), upvoted: delta > 0 };
}
