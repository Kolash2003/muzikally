import Image from "next/image";
import { requireAuth } from "../../authentication/actions";
import { prisma } from "@/lib/db";
import { CreateSessionCard } from "./home/createSessionCard";
import { JoinSessionCard } from "./home/joinSessionCard";
import { StreamGrid, type StreamListItem } from "./home/streamGrid";
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

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
        <Image src="/logo.svg" alt="muzi" width={96} height={32} priority />
        <div className="ml-auto">
          <UserMenu
            name={session.user.name}
            email={session.user.email}
            image={session.user.image}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <section>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Hey {firstName} — ready to jam?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Start a session and share the invite code, or jump into a
            friend&apos;s room.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <CreateSessionCard />
          <JoinSessionCard />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Your sessions
          </h2>
          <StreamGrid items={items} />
        </section>
      </main>
    </div>
  );
};

export default HomePage;
