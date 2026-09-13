import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import z from "zod";
import { headers } from "next/headers";

const removeUserFromStreamSchema = z.object({
    userId: z.string(),
    streamId: z.string()
})

export async function DELETE(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) {
            return NextResponse.json({
                success: false,
                message: "Unauthorized",
                error: null
            }, {
                status: 401
            });
        }

        const { streamId, userId } = removeUserFromStreamSchema.parse(
            Object.fromEntries(req.nextUrl.searchParams)
        );

        // Verify the requester owns this stream (session.user.id is the streamerId)
        const stream = await prisma.stream.findFirst({
            where: {
                id: streamId,
                userId: session.user.id,
            },
        });

        if (!stream) {
            return NextResponse.json({
                success: false,
                message: "Stream not found or you are not the stream owner",
                error: null,
            }, {
                status: 403
            });
        }

        await prisma.participation.deleteMany({
            where: {
                streamId,
                userId,
            },
        });

        return NextResponse.json({
            success: true,
            message: "User removed from stream",
            error: null,
        }, {
            status: 200
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: "Error while removing user from stream",
            error: error instanceof Error ? error.message : String(error),
        }, {
            status: 400
        });
    }
}
