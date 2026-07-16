import { NextRequest, NextResponse } from "next/server"
import { exchangeGithubCodeForToken, getGithubUserInfo } from "@/lib/github-auth"
import { encrypt } from "@/lib/encryption"
import { CredentialType } from "@/generated/prisma"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const stateParam = searchParams.get("state")
  const error = searchParams.get("error")

  // GitHub denied access
  if (error) {
    return NextResponse.redirect(
      new URL(`/credentials/new?github_error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(
      new URL("/credentials/new?github_error=missing_code", request.url)
    )
  }

  // Parse state: base64url-encoded JSON { userId, credentialName, credentialType, returnUrl }
  let stateData: {
    userId: string
    credentialName: string
    credentialType: string
    returnUrl: string
  }
  try {
    stateData = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf-8"))
  } catch {
    return NextResponse.redirect(
      new URL("/credentials/new?github_error=invalid_state", request.url)
    )
  }

  // CSRF verification
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id || session.user.id !== stateData.userId) {
    return NextResponse.redirect(
      new URL("/credentials/new?github_error=unauthorized", request.url)
    )
  }

  try {
    // Exchange code for token
    const tokens = await exchangeGithubCodeForToken(code)

    // Get user's GitHub info for display
    const userInfo = await getGithubUserInfo(tokens.access_token)

    // Validate returnUrl is relative
    const safeReturnUrl = (stateData.returnUrl ?? "/credentials").startsWith("/")
      ? stateData.returnUrl
      : "/credentials"

    // Store credential value as encrypted JSON
    const credentialValue = JSON.stringify({
      accessToken: tokens.access_token,
      username: userInfo.login,
      connectedAt: new Date().toISOString(),
    })

    // Upsert: update if credential with same name+type+userId exists, otherwise create
    const existing = await prisma.credential.findFirst({
      where: {
        userId: stateData.userId,
        name: stateData.credentialName,
        type: stateData.credentialType as CredentialType,
      },
    })

    let credentialId: string
    if (existing) {
      await prisma.credential.update({
        where: { id: existing.id },
        data: { value: encrypt(credentialValue) },
      })
      credentialId = existing.id
    } else {
      const created = await prisma.credential.create({
        data: {
          userId: stateData.userId,
          name: stateData.credentialName,
          type: stateData.credentialType as CredentialType,
          value: encrypt(credentialValue),
        },
      })
      credentialId = created.id
    }

    // Redirect back with success indicators
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://nodebase.mayanksaraswal.in"
    const successUrl = new URL(safeReturnUrl, baseUrl)
    successUrl.searchParams.set("github_success", userInfo.login)
    successUrl.searchParams.set("credential_id", credentialId)

    return NextResponse.redirect(successUrl)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error"
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://nodebase.mayanksaraswal.in"
    const safeErrorReturn = (stateData?.returnUrl ?? "/credentials/new").startsWith("/")
      ? (stateData?.returnUrl ?? "/credentials/new")
      : "/credentials/new"
    return NextResponse.redirect(
      new URL(`${safeErrorReturn}?github_error=${encodeURIComponent(errMsg)}`, baseUrl)
    )
  }
}
