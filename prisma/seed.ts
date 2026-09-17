import "dotenv/config";
import { prisma } from "../lib/db";
import { DEMO_STREAM_CODE } from "../lib/demo";

/**
 * Seeds a public demo jam room so first-time visitors land in a room that
 * already feels alive. Idempotent: safe to run repeatedly (upserts only).
 *
 * Track metadata verified against YouTube oEmbed.
 */

const DEMO_HOST_ID = "demo-host";
const DEMO_VOTER_IDS = ["demo-ava", "demo-kabir", "demo-zoe"] as const;

const DEMO_TRACKS = [
  {
    title: "Daft Punk - One More Time (Official Video)",
    artist: "Daft Punk",
    url: "https://www.youtube.com/watch?v=FGBhQbmPwH8",
    videoId: "FGBhQbmPwH8",
    durationSeconds: 320,
    current: true,
    votes: [] as string[],
  },
  {
    title: "M83 'Midnight City' Official video",
    artist: "M83",
    url: "https://www.youtube.com/watch?v=dX3k_QDnzHE",
    videoId: "dX3k_QDnzHE",
    durationSeconds: 243,
    current: false,
    votes: ["demo-ava", "demo-kabir", "demo-zoe"],
  },
  {
    title: "Justice - D.A.N.C.E. (Official Video)",
    artist: "Justice",
    url: "https://www.youtube.com/watch?v=sy1dYFGkPUE",
    videoId: "sy1dYFGkPUE",
    durationSeconds: 242,
    current: false,
    votes: ["demo-ava", "demo-kabir"],
  },
  {
    title: "Tame Impala - The Less I Know The Better (Official Video)",
    artist: "tameimpalaVEVO",
    url: "https://www.youtube.com/watch?v=sBzrzS1Ag_g",
    videoId: "sBzrzS1Ag_g",
    durationSeconds: 216,
    current: false,
    votes: ["demo-zoe"],
  },
  {
    title: "MGMT - Electric Feel (Official HD Video)",
    artist: "MGMTVEVO",
    url: "https://www.youtube.com/watch?v=MmZexg8sxyk",
    videoId: "MmZexg8sxyk",
    durationSeconds: 229,
    current: false,
    votes: ["demo-ava"],
  },
  {
    title: "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)",
    artist: "Rick Astley",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    videoId: "dQw4w9WgXcQ",
    durationSeconds: 213,
    current: false,
    votes: [],
  },
];

async function main() {
  const host = await prisma.user.upsert({
    where: { id: DEMO_HOST_ID },
    update: {},
    create: {
      id: DEMO_HOST_ID,
      name: "muzi",
      email: "demo-host@muzi.local",
      emailVerified: true,
    },
  });

  const voters = await Promise.all(
    DEMO_VOTER_IDS.map((id) =>
      prisma.user.upsert({
        where: { id },
        update: {},
        create: {
          id,
          name: id.replace("demo-", ""),
          email: `${id}@muzi.local`,
          emailVerified: true,
        },
      }),
    ),
  );

  const stream = await prisma.stream.upsert({
    where: { code: DEMO_STREAM_CODE },
    update: { active: true },
    create: {
      code: DEMO_STREAM_CODE,
      type: "Youtube",
      active: true,
      userId: host.id,
    },
  });

  for (const [index, track] of DEMO_TRACKS.entries()) {
    const music = await prisma.music.upsert({
      where: { id: `demo-track-${index + 1}` },
      update: {
        title: track.title,
        artist: track.artist,
        current: track.current,
      },
      create: {
        id: `demo-track-${index + 1}`,
        streamId: stream.id,
        userId: host.id,
        title: track.title,
        artist: track.artist,
        url: track.url,
        source: "Youtube",
        thumbnailUrl: `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`,
        durationSeconds: track.durationSeconds,
        current: track.current,
      },
    });

    for (const voterId of track.votes) {
      await prisma.upvote.upsert({
        where: { musicId_userId: { musicId: music.id, userId: voterId } },
        update: {},
        create: { musicId: music.id, userId: voterId },
      });
    }
  }

  // Make the demo voters members of the room so participant counts look real.
  for (const voter of voters) {
    await prisma.participation.upsert({
      where: {
        streamId_userId: { streamId: stream.id, userId: voter.id },
      },
      update: {},
      create: { streamId: stream.id, userId: voter.id },
    });
  }

  console.log(
    `Seeded demo room "${DEMO_STREAM_CODE}" (${stream.id}) with ${DEMO_TRACKS.length} tracks.`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
