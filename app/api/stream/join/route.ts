import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/db";

const joinParticipantToStream = z.object({
    code: z.string(),
})

const LetUserExitFromStreamSchema = z.object({
    streamId: z.string()
})

export async function POST(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });
    
        if(!session?.user) {
            return NextResponse.json({
                success: false,
                message: "unauthorized",
                error: null
            }, {
                status: 401,
            })
        }
    
        const data = joinParticipantToStream.parse(await req.json())
    
        const isTheCodeValid = await prisma.stream.findUnique({
            where: {
                code: data.code,
            }
        })
    
        if(!isTheCodeValid){ 
            return NextResponse.json({
                success: false,
                message: "The provided code does not match",
                data: null
            })
        }
    
        const joinEndUser = await prisma.participation.create({
            data: {
                userId: session.user.id,
                streamId: isTheCodeValid.id
            }
        })
    
        return NextResponse.json({
            success: true,
            message: `user ${session.user.name} added to the stream`,
            data: joinEndUser,
            error: null
        }, {
            status: 201
        })
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: "Failed to join the stream",
            error,
        }, {
            status: 501
        })
    }
}


export async function DELETE(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })
    
        if(!session?.user) {
            return NextResponse.json({
                success: false,
                message: "Unauthorized",
                data: null,
            }, {
                status: 401
            })
        }
    
        const { streamId } = LetUserExitFromStreamSchema.parse(
            Object.fromEntries(req.nextUrl.searchParams)
        );
    
        const exitUser = await prisma.participation.delete({
            where: {
                streamId_userId: {
                    streamId: streamId,
                    userId: session.user.id
                }
            }
        })
    
        return NextResponse.json({
            success: true,
            message: `User ${session.user.name} exited from stream`,
            error: null,
        }, {
            status: 201
        })
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: "Failed to exit from the stream",
            error
        }, {
            status: 501
        })
    }
}