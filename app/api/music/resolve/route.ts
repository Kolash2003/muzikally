import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Resolve a YouTube/Spotify URL to title/artist/thumbnail via oEmbed.
 * No API key required. Used by the add-song input to show a preview
 * before the user adds the track to the queue.
 */

type Source = "Youtube" | "Spotify";

interface ResolvedMetadata {
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
  source: Source;
}

function getSourceFromUrl(url: string): Source | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      return "Youtube";
    }
    if (hostname.includes("spotify.com")) {
      return "Spotify";
    }
    return null;
  } catch {
    return null;
  }
}

const OEMBED_ENDPOINTS: Record<Source, string> = {
  Youtube: "https://www.youtube.com/oembed",
  Spotify: "https://open.spotify.com/oembed",
};

async function fetchOEmbed(
  url: string,
  source: Source,
): Promise<ResolvedMetadata | null> {
  const endpoint = `${OEMBED_ENDPOINTS[source]}?url=${encodeURIComponent(url)}&format=json`;
  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    if (!json.title) return null;
    return {
      title: json.title,
      artist: json.author_name ?? null,
      thumbnailUrl: json.thumbnail_url ?? null,
      source,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", error: null },
        { status: 401 },
      );
    }

    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json(
        { success: false, message: "Missing url parameter", error: null },
        { status: 400 },
      );
    }

    const source = getSourceFromUrl(url);
    if (!source) {
      return NextResponse.json(
        {
          success: false,
          message: "Only YouTube and Spotify links are supported",
          error: null,
        },
        { status: 400 },
      );
    }

    const metadata = await fetchOEmbed(url, source);
    if (!metadata) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not resolve that link — check the URL",
          error: null,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, data: metadata, error: null },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error while resolving the link",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
