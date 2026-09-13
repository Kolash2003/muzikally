import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";


// Get all streams created by user in desc order
export async function GET() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({
                success: false,
                message: "Unauthorized",
            }, {
                status: 401,
            });
        }

        const streams = await prisma.stream.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({
            success: true,
            data: streams,
            error: null,
        }, {
            status: 200,
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: "Error while trying to get streams",
            error: error instanceof Error ? error.message : String(error),
        }, {
            status: 400,
        });
    }
}
