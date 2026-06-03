import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json() as { token: string }

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { emailVerifyToken: token },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or already used verification link." },
        { status: 400 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { success: true, message: "Already verified" }
      )
    }

    if (!user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
      return NextResponse.json(
        { error: "TOKEN_EXPIRED" },
        { status: 400 }
      )
    }

    // Mark as verified — clear the token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
        emailVerifyAttempts: 0,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    )
  }
}
