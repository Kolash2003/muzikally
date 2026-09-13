import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import z from "zod";
import { headers } from "next/headers";

const addMusicToStream = z.object({
    streamId: z.string(),
    title: z.string().min(1),
    artist: z.string().optional(),
    url: z.string()
})

function getSourceFromUrl(url: string): "Youtube" | "Spotify" | null {
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

// add music to a stream
export async function POST(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({
                success: false,
                message: "Unauthorized",
                error: null
            }, {
                status: 401
            })
        }

        const parsed = addMusicToStream.safeParse(await req.json());

        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                message: "Invalid request body",
                error: parsed.error.message
            }, {
                status: 400
            })
        }

        const data = parsed.data;

        const source = getSourceFromUrl(data.url);

        if (!source) {
            return NextResponse.json({
                success: false,
                message: "Only Youtube and Spotify urls are supported",
                error: null
            }, {
                status: 400
            })
        }

        const stream = await prisma.stream.findUnique({
            where: {
                id: data.streamId,
            }
        })

        if (!stream) {
            return NextResponse.json({
                success: false,
                message: "Stream not found",
                error: null
            }, {
                status: 404
            })
        }

        if (!stream.active) {
            return NextResponse.json({
                success: false,
                message: "Stream has ended, cannot add music",
                error: null
            }, {
                status: 400
            })
        }

        const music = await prisma.music.create({
            data: {
                streamId: data.streamId,
                userId: session.user.id,
                title: data.title,
                artist: data.artist,
                url: data.url,
                source: source,
            }
        })

        return NextResponse.json({
            success: true,
            message: "Music added to the stream",
            data: music,
            error: null
        }, {
            status: 201
        })
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: "Error while adding music to the stream",
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
