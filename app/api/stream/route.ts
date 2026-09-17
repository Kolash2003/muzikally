import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { broadcastStreamEnded } from "@/lib/socket";
import { headers } from "next/headers";

const MAX_OWNED_STREAMS = 5;

const CreateStreamSchema = z.object({
    type: z.enum(["Spotify", "Youtube"]).default("Youtube"),
});

const getStreamSchema = z.object({
    streamId: z.string(),
})

const endStreamSchema = z.object({
    streamId: z.string()
})

const deleteStreamSchema = z.object({
    streamId: z.string()
})


// streamer creates a stream
export async function POST(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const data = CreateStreamSchema.parse(await req.json());

        const streamCode = crypto.randomUUID().replace(/-/g, "").slice(0, 8);

        const stream = await prisma.stream.create({
            data: {
                type: data.type,
                code: streamCode,
                userId: session.user.id,
            },
        });

        const overflow = await prisma.stream.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            skip: MAX_OWNED_STREAMS,
            select: { id: true },
        });

        if (overflow.length > 0) {
            const overflowIds = overflow.map((s) => s.id);
            await prisma.stream.deleteMany({
                where: { id: { in: overflowIds } },
            });
            await Promise.all(overflowIds.map((id) => broadcastStreamEnded(id)));
        }

        return NextResponse.json(
            { success: true, 
                stream,
                error: null
            },
            { status: 201 }
        );
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: "Error while creating a stream",
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 400 }
        );
    }
}

// get stream by streamId
export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if(!session?.user) {
            return NextResponse.json({
                success: false,
                message: "unauthorized"
            }, {
                status: 401
            })
        }

        const data = getStreamSchema.parse(
            Object.fromEntries(req.nextUrl.searchParams)
        )

        const streamData = await prisma.stream.findFirst({
            where: {
                id: data.streamId,
                userId: session.user.id,
            }
        });

        return NextResponse.json({
            success: true,
            data: streamData,
            error: null
        }, {
            status: 200
        })

    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: "Error while trying to get stream",
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 400 }
        );
    }
}


export async function PATCH(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if(!session?.user) {
            return NextResponse.json({
                success: false,
                message: "Unauthorized",
                error: null
            }, {
                status: 401
            })
        }

        const data = endStreamSchema.parse(await req.json());

        const stream = await prisma.stream.findFirst({
            where: {
                id: data.streamId,
                userId: session.user.id,
            },
            select: { id: true, active: true },
        });

        if (!stream) {
            return NextResponse.json({
                success: false,
                message: "Stream not found or you are not the host",
                error: null
            }, {
                status: 404
            })
        }

        if (stream.active) {
            await prisma.stream.update({
                where: { id: stream.id },
                data: { active: false },
            });
        }

        // Notify the room and clear cached stream state.
        await broadcastStreamEnded(data.streamId);

        return NextResponse.json({
            success: true,
            message: `Stream with id ${stream.id} ended succesfully`,
            error: null
        }, {
            status: 200
        })
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: "Error while ending the stream",
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 400 }
        );
    }
}


// streamer deletes a stream
export async function DELETE(req: NextRequest) {
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

        const data = deleteStreamSchema.parse(await req.json());

        const deletedStream = await prisma.stream.delete({
            where: {
                id: data.streamId,
                userId: session.user.id
            }
        })

        return NextResponse.json({
            success: true,
            message: `Stream with id ${deletedStream.id} deleted successfully`,
            error: null
        }, {
            status: 200
        })
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: "Error while deleting stream",
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 400 }
        );
    }
}


