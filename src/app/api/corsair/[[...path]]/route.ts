import { toNextJsHandler } from "corsair"
import { isCorsairEnabled, tryGetCorsair } from "@/lib/corsair"

export const runtime = "nodejs"

function handlers() {
  if (!isCorsairEnabled()) {
    const disabled = async () =>
      Response.json(
        { error: "Corsair is disabled. Set CORSAIR_ENABLED=true." },
        { status: 503 },
      )
    return { GET: disabled, POST: disabled, OPTIONS: disabled }
  }

  const corsair = tryGetCorsair()
  if (!corsair) {
    const fail = async () =>
      Response.json(
        { error: "Corsair failed to initialize. Check CORSAIR_KEK and DATABASE_URL." },
        { status: 500 },
      )
    return { GET: fail, POST: fail, OPTIONS: fail }
  }

  return toNextJsHandler(corsair, { basePath: "/api/corsair" })
}

const h = handlers()
export const GET = h.GET
export const POST = h.POST
export const OPTIONS = h.OPTIONS
