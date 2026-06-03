import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { generateVerifyToken, getTokenExpiry, sendVerificationEmail } from "@/lib/email-verification"
import { hash } from "bcryptjs"
import { createId } from "@paralleldrive/cuid2"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 })
    }

    // 1. Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      if (existing.emailVerified) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 })
      } else {
        if (existing.emailVerifyAttempts >= 5) {
          return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429 })
        }
        // Resend verification to unverified account
        const token = generateVerifyToken()
        await prisma.user.update({
          where: { email },
          data: {
            emailVerifyToken: token,
            emailVerifyExpiry: getTokenExpiry(),
          },
        })
        try {
          await sendVerificationEmail(email, existing.name || email, token)
        } catch (emailError) {
          console.error("Failed to send verification email:", emailError)
        }
        return NextResponse.json({ success: "VERIFICATION_SENT", email })
      }
    }

    // 2. Hash password
    const hashedPassword = await hash(password, 12)

    // 3. Generate token
    const verifyToken = generateVerifyToken()
    const verifyExpiry = getTokenExpiry()

    // 4. Create user — NOT verified yet
    // Since we're partially bypassing better-auth for custom signup, we must create Account records for passwords manually or just rely on better-auth's adapter if we sign in email later.
    // Actually better-auth natively stores password in `Account` model.
    // Let's create the User first.
    const user = await prisma.user.create({
      data: {
        id: createId(),
        email,
        name: name || email.split("@")[0],
        emailVerified: false,
        emailVerifyToken: verifyToken,
        emailVerifyExpiry: verifyExpiry,
      },
    })
    
    // Also create account for password login
    await prisma.account.create({
      data: {
        id: createId(),
        userId: user.id,
        accountId: email,
        providerId: "credential",
        password: hashedPassword,
      }
    })

    // 5. Send verification email (non-blocking)
    try {
      await sendVerificationEmail(email, user.name || email, verifyToken)
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError)
    }

    // 6. DO NOT log them in — return success directive
    return NextResponse.json({ success: "VERIFICATION_SENT", email })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
