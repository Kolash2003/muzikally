import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const getAllParticipantsInAStream = z.object({
    streamId: z.string(),
})

export async function GET(req: NextRequest){
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
    
        if(!session?.user) {
            return NextResponse.json({
                success: false,
                message: "unauthorised",
                error: null,
            }, {
                status: 401
            });
        }
    
        const streamData = getAllParticipantsInAStream.parse(await req.json());
    
        const data = await prisma.stream.findMany({
            where: {
                id: streamData.streamId,
            },
            include: {
                participants: true,
            },
        });
    
        return NextResponse.json({
            success: true,
            message: "fetched all participants in a stream",
            data,
            error: null
        }, {
            status: 200
        })
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: "Error trying to get all participants in a stream",
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 400 }
        );
    }
}

export async function PATCH() {
    
}