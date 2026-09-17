"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowBigUp, Loader2, Music2, Radio, Sparkles, Volume2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12 selection:bg-primary/30">
      {/* Dynamic ambient radial gradients */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 right-10 -z-10 h-[400px] w-[500px] rounded-full bg-indigo-500/10 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"
      />

      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-10 text-center">
        {/* Brand Header & Live Pill */}
        <div className="flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary backdrop-blur-md">
            <span className="relative flex size-2">
              <span className="radar-ring absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span>v1.0 • Collaborative Social Jukebox</span>
          </div>

          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="muzi"
              width={140}
              height={37}
              priority
              className="h-auto w-auto drop-shadow-[0_0_24px_rgba(168,85,247,0.35)]"
            />
          </div>

          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Jam in sync.{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 bg-clip-text text-transparent">
              Vote the queue.
            </span>
          </h1>

          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            Create real-time rooms, share your code with friends, and upvote tracks to the top. No aux cord required.
          </p>
        </div>

        {/* Live Interactive Preview Card */}
        <div className="relative w-full max-w-md">
          {/* Subtle glow behind card */}
          <div
            aria-hidden
            className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 blur-lg"
          />

          <div className="relative rounded-2xl border border-white/10 bg-card/85 p-4 text-left shadow-2xl backdrop-blur-xl sm:p-5">
            <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="radar-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Live Jam • #49A2
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Radio className="size-3.5 text-primary animate-pulse" />
                <span>4 jamming</span>
              </div>
            </div>

            {/* Now Playing Track Item */}
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3">
              <div className="relative flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Music2 className="size-6" />
                <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-background border border-border">
                  <Volume2 className="size-3 text-primary" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-3.5 items-end gap-0.5" aria-hidden>
                    <span className="eq-bar-1 w-0.5 rounded-full bg-primary" />
                    <span className="eq-bar-2 w-0.5 rounded-full bg-primary" />
                    <span className="eq-bar-3 w-0.5 rounded-full bg-primary" />
                    <span className="eq-bar-4 w-0.5 rounded-full bg-primary" />
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Now Playing
                  </p>
                </div>
                <p className="truncate text-sm font-semibold text-foreground">
                  Starboy (feat. Daft Punk)
                </p>
                <p className="truncate text-xs text-muted-foreground">The Weeknd</p>
              </div>

              <div className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/40 bg-primary/20 px-2.5 py-1 text-xs font-bold text-primary tabular-nums">
                <ArrowBigUp className="size-4 fill-current" />
                <span>24</span>
              </div>
            </div>

            {/* Micro Feature Highlights inside card */}
            <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-border/50 bg-muted/30 p-2">
                <p className="text-[10px] text-muted-foreground">Sync Latency</p>
                <p className="font-mono text-xs font-bold text-foreground">~25ms</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-2">
                <p className="text-[10px] text-muted-foreground">Queue Mode</p>
                <p className="text-xs font-bold text-foreground">Live Upvotes</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-2">
                <p className="text-[10px] text-muted-foreground">Sources</p>
                <p className="text-xs font-bold text-foreground">YouTube & Spotify</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action / Sign In Card */}
        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          <Button
            size="lg"
            disabled={loading}
            onClick={handleSignIn}
            className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-white/15 bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/95 hover:shadow-primary/40 active:scale-[0.98]"
          >
            {/* Hover shine effect */}
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
            />
            {loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Image src="/google.svg" alt="Google" width={22} height={22} />
            )}
            <span>{loading ? "Signing you in…" : "Continue with Google"}</span>
          </Button>

          {/* Trust points */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Zap className="size-3 text-amber-400" /> Instant access
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Sparkles className="size-3 text-primary" /> Free forever
            </span>
            <span>•</span>
            <span>No install needed</span>
          </div>
        </div>
      </div>
    </div>
  );
}