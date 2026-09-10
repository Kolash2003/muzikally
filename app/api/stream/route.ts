import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const CreateStreamSchema = z.object({
    type: z.enum(["Spotify", "Youtube"]).default("Youtube"),
});

const getStreamSchema = z.object({
    streamId: z.string(),
})

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
