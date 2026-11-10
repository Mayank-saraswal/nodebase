import { NextRequest, NextResponse } from "next/server"
import { buildGithubAuthUrl } from "@/lib/github-auth"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import {
  createOAuthState,
  oauthStateCookieOptions,
  safeReturnPath,
} from "@/lib/oauth-state"

const STATE_COOKIE = "nodebase_github_oauth_state"

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const rawCredentialName = searchParams.get("name")
  const credentialName = rawCredentialName && rawCredentialName.length <= 100
    ? rawCredentialName
    : "My GitHub Account"
  const rawCredentialType = searchParams.get("type")
  const credentialType = rawCredentialType && rawCredentialType.length <= 100
    ? rawCredentialType
    : "GITHUB_APP"
  const returnUrl = safeReturnPath(searchParams.get("returnUrl"), "/credentials")

  const oauthState = createOAuthState({
    userId: session.user.id,
    credentialName,
    credentialType,
    returnUrl,
  })

  const response = NextResponse.redirect(buildGithubAuthUrl(oauthState.state))
  response.cookies.set(STATE_COOKIE, oauthState.cookieValue, oauthStateCookieOptions())
  return response
}
