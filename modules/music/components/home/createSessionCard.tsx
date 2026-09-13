"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Music, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type StreamType = "Youtube" | "Spotify";

export function CreateSessionCard() {
  const router = useRouter();
  const [type, setType] = useState<StreamType>("Youtube");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      if (!json?.success || !json?.stream?.id) {
        throw new Error(json?.message || "Could not create the session");
      }
      router.push(`/stream/${json.stream.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start a jam session</CardTitle>
        <CardDescription>
          Pick a source, get an invite code, and share it with friends.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2" role="group" aria-label="Source">
          {(["Youtube", "Spotify"] as const).map((t) => (
            <Button
              key={t}
              variant={type === t ? "default" : "outline"}
              size="sm"
              onClick={() => setType(t)}
              disabled={pending}
            >
              <Music className="size-4" />
              {t}
            </Button>
          ))}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button onClick={start} disabled={pending} className="self-start">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Music className="size-4" />
          )}
          Start session
        </Button>
      </CardContent>
    </Card>
  );
}
