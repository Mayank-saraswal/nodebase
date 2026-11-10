import { NextRequest, NextResponse } from "next/server"
import { exchangeCodeForTokens, getGoogleUserInfo, getGoogleClientId } from "@/lib/google-auth"
import { encrypt } from "@/lib/encryption"
import { CredentialType } from "@/generated/prisma"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import {
  oauthStateCookieOptions,
  readOAuthState,
  safeReturnPath,
} from "@/lib/oauth-state"

const STATE_COOKIE = "nodebase_google_oauth_state"

function redirect(
  request: NextRequest,
  returnPath: string,
  params: Record<string, string>,
) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://nodebase.mayanksaraswal.in"
  const target = new URL(safeReturnPath(returnPath, "/credentials/new"), baseUrl)
  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, value)
  }
  const response = NextResponse.redirect(target)
  response.cookies.set(STATE_COOKIE, "", oauthStateCookieOptions(0))
  return response
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const stateParam = searchParams.get("state")
  const error = searchParams.get("error")
  const stateData = readOAuthState(
    request.cookies.get(STATE_COOKIE)?.value,
    stateParam,
  )

  if (error) {
    return redirect(request, stateData?.returnUrl ?? "/credentials/new", { google_error: error })
  }

  if (!code) {
    return redirect(request, "/credentials/new", { google_error: "missing_code" })
  }

  if (!stateData) {
    return redirect(request, "/credentials/new", { google_error: "invalid_state" })
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id || session.user.id !== stateData.userId) {
    return redirect(request, "/credentials/new", { google_error: "unauthorized" })
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, stateData.credentialType)

    // Get user's Google email for display
    const userInfo = await getGoogleUserInfo(tokens.access_token)

    // Store credential value as encrypted JSON
    const credentialValue = JSON.stringify({
      refreshToken: tokens.refresh_token,
      email: userInfo.email, // cosmetic only — used to show "Connected as X"
      clientId: getGoogleClientId(stateData.credentialType), // issuing client — used by refreshGoogleAccessToken
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
    return redirect(
      request,
      stateData.returnUrl,
      { google_success: userInfo.email, credential_id: credentialId },
    )
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error"
    return redirect(request, stateData.returnUrl, { google_error: errMsg })
  }
}
