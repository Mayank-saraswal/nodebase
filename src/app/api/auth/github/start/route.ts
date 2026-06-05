import { NextRequest, NextResponse } from "next/server"
import { buildGithubAuthUrl } from "@/lib/github-auth"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const credentialName = searchParams.get("name") || "My GitHub Account"
  const credentialType = searchParams.get("type") || "GITHUB_APP"
  const rawReturnUrl = searchParams.get("returnUrl") || "/credentials"
  // Only allow relative paths — block open redirect to external URLs
  const returnUrl = rawReturnUrl.startsWith("/") ? rawReturnUrl : "/credentials"

  // Encode state as base64url JSON: { userId, credentialName, credentialType, returnUrl }
  const stateData = {
    userId: session.user.id,
    credentialName,
    credentialType,
    returnUrl,
  }
  const state = Buffer.from(JSON.stringify(stateData)).toString("base64url")

  const authUrl = buildGithubAuthUrl(state)
  return NextResponse.redirect(authUrl)
}
