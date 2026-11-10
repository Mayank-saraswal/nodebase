import { NextRequest, NextResponse } from "next/server"
import { isCorsairEnabled, tryGetCorsair, getAppUrl } from "@/lib/corsair"

export const runtime = "nodejs"

/**
 * Manual-mode OAuth callback for Corsair plugins.
 * Provider redirects here with ?code=&state=
 */
export async function GET(req: NextRequest) {
  const appUrl = getAppUrl()

  if (!isCorsairEnabled()) {
    return NextResponse.redirect(
      `${appUrl}/credentials?corsair_error=disabled`,
    )
  }

  const corsair = tryGetCorsair()
  if (!corsair) {
    return NextResponse.redirect(
      `${appUrl}/credentials?corsair_error=init_failed`,
    )
  }

  const code = req.nextUrl.searchParams.get("code")
  const state = req.nextUrl.searchParams.get("state")
  const oauthError = req.nextUrl.searchParams.get("error")

  if (oauthError) {
    return NextResponse.redirect(
      `${appUrl}/credentials?corsair_error=${encodeURIComponent(oauthError)}`,
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/credentials?corsair_error=missing_code_or_state`,
    )
  }

  try {
    await corsair.manage.connect.oauthCallback({ code, state })
    return NextResponse.redirect(
      `${appUrl}/credentials?corsair_connected=1`,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_callback_failed"
    // Do not leak tokens; message is provider-safe enough for query param length
    return NextResponse.redirect(
      `${appUrl}/credentials?corsair_error=${encodeURIComponent(message.slice(0, 200))}`,
    )
  }
}
