import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { isCorsairEnabled, tryGetCorsair } from "@/lib/corsair"

export const runtime = "nodejs"

/**
 * Resolve a manual connect `state` into a provider oauthUrl.
 * Requires a logged-in session so anonymous users cannot drive OAuth.
 */
export async function POST(req: NextRequest) {
  if (!isCorsairEnabled()) {
    return NextResponse.json({ error: "Corsair is disabled" }, { status: 503 })
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const corsair = tryGetCorsair()
  if (!corsair) {
    return NextResponse.json(
      { error: "Corsair failed to initialize" },
      { status: 500 },
    )
  }

  let body: { state?: string }
  try {
    body = (await req.json()) as { state?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.state) {
    return NextResponse.json({ error: "Missing state" }, { status: 400 })
  }

  try {
    const resolved = await corsair.manage.connect.resolve(body.state)
    // Optional: ensure resolved.tenantId matches session user (Phase A tenancy)
    if (resolved.tenantId && resolved.tenantId !== session.user.id) {
      return NextResponse.json(
        { error: "Connect link tenant does not match signed-in user" },
        { status: 403 },
      )
    }
    return NextResponse.json({
      oauthUrl: resolved.oauthUrl,
      plugin: resolved.plugin,
      tenantId: resolved.tenantId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "resolve_failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
