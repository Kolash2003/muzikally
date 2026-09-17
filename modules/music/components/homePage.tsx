import Image from "next/image";
import { requireAuth } from "../../authentication/actions";
import { prisma } from "@/lib/db";
import { CreateSessionCard } from "./home/createSessionCard";
import { JoinSessionCard } from "./home/joinSessionCard";
import { StreamGrid, type StreamListItem } from "./home/streamGrid";
import { StreamListRefresher } from "./home/stream-list-refresher";
import { UserMenu } from "./home/userMenu";

const HomePage = async () => {
  const session = await requireAuth();
  const userId = session.user.id;

  const [owned, participations] = await Promise.all([
    prisma.stream.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.participation.findMany({
      where: { userId, stream: { userId: { not: userId } } },
      include: { stream: true },
      orderBy: { joinedAt: "desc" },
    }),
  ]);

  const items: StreamListItem[] = [
    ...owned.map((s) => ({
      id: s.id,
      code: s.code,
      type: s.type,
      active: s.active,
      role: "Owner" as const,
      createdAt: s.createdAt.toISOString(),
    })),
    ...participations.map((p) => ({
      id: p.stream.id,
      code: p.stream.code,
      type: p.stream.type,
      active: p.stream.active,
      role: "Member" as const,
      createdAt: p.stream.createdAt.toISOString(),
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const firstName = session.user.name?.split(" ")[0] ?? "there";
  const activeCount = items.filter((i) => i.active).length;

  return (
    <div className="relative flex min-h-full flex-col bg-background selection:bg-primary/30">
      {/* Subtle ambient lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -z-10 h-96 w-full max-w-5xl -translate-x-1/2 bg-gradient-to-b from-primary/10 via-transparent to-transparent blur-3xl"
      />

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background/70 px-4 py-3 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.svg"
            alt="muzi"
            width={120}
            height={32}
            priority
            className="h-auto w-auto transition-opacity hover:opacity-90"
          />
          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
            <span className="relative flex size-1.5">
              <span className="radar-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
            <span>Real-time Sync</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <UserMenu
            name={session.user.name}
            email={session.user.email}
            image={session.user.image}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Hey {firstName} —{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 bg-clip-text text-transparent">
              ready to jam?
            </span>
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Start your own room to broadcast music, or enter an invite code to join a friend&apos;s queue.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <CreateSessionCard />
          <JoinSessionCard />
        </section>

        <section className="flex flex-col gap-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Your sessions</h2>
              {activeCount > 0 ? (
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {activeCount} live
                </span>
              ) : null}
            </div>
            <span className="text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? "session" : "sessions"} total
            </span>
          </div>

          <StreamListRefresher streamIds={items.map((i) => i.id)} />
          <StreamGrid items={items} />
        </section>
      </main>
    </div>
  );
};

export default HomePage;
