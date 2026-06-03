import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { generateVerifyToken, getTokenExpiry, sendResendVerificationEmail } from "@/lib/email-verification"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email: string }

    const user = await prisma.user.findUnique({ where: { email } })

    // Always return success to prevent email enumeration attacks
    if (!user || user.emailVerified) {
      return NextResponse.json({ success: true })
    }

    // Rate limit: max 3 resends per user
    if (user.emailVerifyAttempts >= 3) {
      return NextResponse.json(
        { error: "Too many resend attempts. Please contact support." },
        { status: 429 }
      )
    }

    const token = generateVerifyToken()

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: token,
        emailVerifyExpiry: getTokenExpiry(),
        emailVerifyAttempts: { increment: 1 },
      },
    })

    await sendResendVerificationEmail(email, user.name || email, token)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Resend verification error:", error)
    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    )
  }
}
