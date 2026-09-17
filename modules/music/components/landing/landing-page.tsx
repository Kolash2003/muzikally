import Image from "next/image";
import Link from "next/link";
import {
  ArrowBigUp,
  ArrowRight,
  Crown,
  KeyRound,
  Radio,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { YoutubeIcon, SpotifyIcon } from "@/modules/music/components/brand-icons";
import { DEMO_STREAM_CODE } from "@/lib/demo";
import { cn } from "cn";

/**
 * Public landing page for unauthenticated visitors.
 * Mirrors the product's visual language: glass cards, eq bars, radar pulse.
 * Server component; all motion is CSS and honors prefers-reduced-motion.
 */

const PREVIEW_TRACKS = [
  {
    rank: 1,
    title: "One More Time",
    artist: "Daft Punk",
    duration: "5:20",
    thumb: "https://i.ytimg.com/vi/FGBhQbmPwH8/hqdefault.jpg",
    votes: 14,
    current: true,
  },
  {
    rank: 2,
    title: "Midnight City",
    artist: "M83",
    duration: "4:03",
    thumb: "https://i.ytimg.com/vi/dX3k_QDnzHE/hqdefault.jpg",
    votes: 12,
    current: false,
    voted: true,
  },
  {
    rank: 3,
    title: "D.A.N.C.E.",
    artist: "Justice",
    duration: "4:02",
    thumb: "https://i.ytimg.com/vi/sy1dYFGkPUE/hqdefault.jpg",
    votes: 9,
    current: false,
  },
  {
    rank: 4,
    title: "The Less I Know The Better",
    artist: "Tame Impala",
    duration: "3:36",
    thumb: "https://i.ytimg.com/vi/sBzrzS1Ag_g/hqdefault.jpg",
    votes: 7,
    current: false,
  },
  {
    rank: 5,
    title: "Never Gonna Give You Up",
    artist: "Rick Astley",
    duration: "3:33",
    thumb: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    votes: 6,
    current: false,
  },
];

function EqBars({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-3.5 items-end gap-0.5", className)} aria-hidden>
      <span className="eq-bar-1 w-0.5 rounded-full bg-primary" />
      <span className="eq-bar-2 w-0.5 rounded-full bg-primary" />
      <span className="eq-bar-3 w-0.5 rounded-full bg-primary" />
    </span>
  );
}

function LivePill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
      <span className="relative flex size-1.5">
        <span className="radar-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
      </span>
      Live
    </span>
  );
}

function QueuePreview() {
  return (
    <div className="glass-card relative w-full max-w-md overflow-hidden rounded-2xl motion-safe:animate-[float-subtle_5s_ease-in-out_infinite]">
      {/* Room header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold tracking-tight">
            Friday Night Jam
          </span>
          <LivePill />
        </div>
        <span className="rounded-md border border-border/80 bg-muted/20 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground">
          {DEMO_STREAM_CODE}
        </span>
      </div>

      {/* Queue */}
      <ul className="flex flex-col gap-2 p-4">
        {PREVIEW_TRACKS.map((track) => (
          <li
            key={track.rank}
            className={cn(
              "relative flex items-center gap-3 overflow-hidden rounded-xl border p-2.5",
              track.current
                ? "border-primary/50 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent shadow-md shadow-primary/5"
                : "border-border/60 bg-card/60",
            )}
          >
            {track.rank === 2 ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent motion-safe:animate-[shine_3.5s_ease-in-out_infinite]"
              />
            ) : null}

            <span className="flex w-6 shrink-0 items-center justify-center">
              {track.current ? (
                <EqBars />
              ) : (
                <span
                  className={cn(
                    "font-mono text-xs font-bold tabular-nums",
                    track.rank === 2
                      ? "font-extrabold text-primary"
                      : track.rank === 3
                        ? "text-indigo-400"
                        : "text-muted-foreground",
                  )}
                >
                  #{track.rank}
                </span>
              )}
            </span>

            <span className="relative block size-11 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted">
              <Image
                src={track.thumb}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-foreground">
                {track.title}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {track.artist} · {track.duration}
              </span>
            </span>

            {track.current ? (
              <span className="shrink-0 rounded-md border border-primary/30 bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                Playing
              </span>
            ) : (
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold tabular-nums",
                  track.voted
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/70 bg-muted/20 text-muted-foreground",
                )}
              >
                <ArrowBigUp
                  className={cn("size-3.5", track.voted && "fill-primary")}
                />
                {track.votes}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* Room footer */}
      <div className="flex items-center justify-between border-t border-border/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {["from-purple-400 to-indigo-500", "from-pink-400 to-purple-500", "from-indigo-400 to-purple-400"].map(
              (gradient, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-5 rounded-full border border-background bg-gradient-to-br",
                    gradient,
                  )}
                />
              ),
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            4 in the room
          </span>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          votes reorder live
        </span>
      </div>
    </div>
  );
}

const STEPS = [
  {
    icon: Radio,
    title: "Spin up a room",
    body: "Pick YouTube or Spotify and get a five-character invite code.",
  },
  {
    icon: KeyRound,
    title: "Share the code",
    body: "Friends join from any browser in seconds. No aux cord required.",
  },
  {
    icon: ArrowBigUp,
    title: "Vote the queue",
    body: "Upvotes reorder the queue live. The room's favorite plays next.",
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: "In perfect sync",
    body: "Every vote, skip, and new track lands instantly for everyone in the room. Built on websockets, not refresh.",
    span: "lg:col-span-4",
    visual: "eq",
  },
  {
    icon: null,
    title: "YouTube and Spotify",
    body: "Paste a link from either platform. Titles, artwork, and playback are resolved for you.",
    span: "lg:col-span-2",
    visual: "brands",
  },
  {
    icon: ArrowBigUp,
    title: "Votes run the queue",
    body: "The queue sorts by upvotes, not by who grabbed the aux first. Democracy, enforced by Redis.",
    span: "lg:col-span-2",
    visual: null,
  },
  {
    icon: Crown,
    title: "The host keeps the deck",
    body: "Only the host controls playback. Everyone else shapes what plays next. No more queue hijacking.",
    span: "lg:col-span-4",
    visual: null,
  },
];

export default function LandingPage() {
  return (
    <div className="relative flex min-h-full flex-col bg-background selection:bg-primary/30">
      {/* Ambient lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[480px] w-full max-w-5xl -translate-x-1/2 bg-gradient-to-b from-primary/12 via-transparent to-transparent blur-3xl"
      />

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Image
            src="/logo.svg"
            alt="muzi"
            width={120}
            height={32}
            priority
            className="h-auto w-auto"
          />
          <nav className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "font-semibold text-muted-foreground hover:text-foreground",
              )}
            >
              Sign in
            </Link>
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ size: "sm" }),
                "font-semibold shadow-md shadow-primary/20 active:scale-[0.98]",
              )}
            >
              Start jamming
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-6">
        {/* Hero */}
        <section className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-primary uppercase">
              <span className="relative flex size-1.5">
                <span className="radar-ring absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              Real-time social jukebox
            </span>

            <h1 className="pb-1 text-5xl leading-[1.1] font-extrabold tracking-tight sm:text-6xl">
              The queue is
              <br />
              <em className="italic text-primary">a democracy.</em>
            </h1>

            <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Open a room, share one code, and let everyone&apos;s votes decide
              what plays next. In perfect sync.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/sign-in"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "group gap-1.5 font-semibold shadow-lg shadow-primary/25 active:scale-[0.98]",
                )}
              >
                Start jamming
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#how-it-works"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "font-semibold active:scale-[0.98]",
                )}
              >
                How it works
              </Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <QueuePreview />
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-24 border-t border-border/50 py-16 sm:py-20">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Three steps to the perfect queue
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((step, i) => (
              <div key={step.title} className="group relative flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-primary/70 tabular-nums">
                    0{i + 1}
                  </span>
                  <span className="h-px flex-1 bg-border/60" />
                  <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                    <step.icon className="size-5" />
                  </span>
                </div>
                <h3 className="text-lg font-bold tracking-tight">{step.title}</h3>
                <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border/50 py-16 sm:py-20">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Built for the room, not just the host
          </h2>
          <div className="mt-10 grid gap-4 lg:grid-cols-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className={cn(
                  "glass-card relative flex flex-col gap-3 overflow-hidden rounded-2xl p-6",
                  feature.span,
                )}
              >
                {feature.visual === "brands" ? (
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-400">
                      <YoutubeIcon className="size-5" />
                    </span>
                    <span className="flex size-10 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                      <SpotifyIcon className="size-5" />
                    </span>
                  </div>
                ) : feature.icon ? (
                  <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <feature.icon className="size-5" />
                  </span>
                ) : null}

                <h3 className="text-lg font-bold tracking-tight">
                  {feature.title}
                </h3>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>

                {feature.visual === "eq" ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute right-6 bottom-6 flex h-10 items-end gap-1.5 opacity-70"
                  >
                    {[3, 7, 4, 9, 2, 6].map((h, i) => (
                      <span
                        key={i}
                        className={cn(
                          "w-1 rounded-full bg-primary",
                          i % 2 === 0 ? "eq-bar-1" : i % 3 === 0 ? "eq-bar-3" : "eq-bar-2",
                        )}
                        style={{ height: `${h * 4}px` }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/50 py-16 sm:py-24">
          <div className="glass-card relative flex flex-col items-center gap-6 overflow-hidden rounded-2xl px-6 py-14 text-center sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-64 w-[480px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
            />
            <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ready to kill the aux cord?
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              Free to use. Bring your friends, bring your playlist.
            </p>
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group gap-1.5 font-semibold shadow-lg shadow-primary/25 active:scale-[0.98]",
              )}
            >
              Start jamming
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Image src="/logo.svg" alt="muzi" width={72} height={20} className="h-auto w-auto opacity-80" />
            <span>· Jam together in real-time.</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 muzi. Votes are final.
          </p>
        </div>
      </footer>
    </div>
  );
}
