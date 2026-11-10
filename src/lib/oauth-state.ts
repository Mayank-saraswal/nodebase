import { randomBytes, timingSafeEqual } from "node:crypto"

export interface OAuthStatePayload {
  userId: string
  credentialName: string
  credentialType: string
  returnUrl: string
}

export const OAUTH_STATE_MAX_AGE_SECONDS = 600

export function createOAuthState(payload: OAuthStatePayload) {
  const nonce = randomBytes(32).toString("base64url")
  return {
    state: nonce,
    cookieValue: JSON.stringify({ nonce, ...payload }),
  }
}

export function readOAuthState(
  cookieValue: string | undefined,
  state: string | null,
): OAuthStatePayload | null {
  if (!cookieValue || !state || !/^[A-Za-z0-9_-]{43}$/.test(state)) return null

  try {
    const data = JSON.parse(cookieValue)
    if (
      typeof data.nonce !== "string" ||
      typeof data.userId !== "string" ||
      typeof data.credentialName !== "string" ||
      typeof data.credentialType !== "string" ||
      typeof data.returnUrl !== "string"
    ) {
      return null
    }

    const nonce = Buffer.from(data.nonce)
    const received = Buffer.from(state)
    if (nonce.length !== received.length || !timingSafeEqual(nonce, received)) return null

    return {
      userId: data.userId,
      credentialName: data.credentialName,
      credentialType: data.credentialType,
      returnUrl: data.returnUrl,
    }
  } catch {
    return null
  }
}

export function safeReturnPath(value: string | null | undefined, fallback: string): string {
  if (
    !value ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return fallback
  }

  try {
    const target = new URL(value, "https://nodebase.invalid")
    if (target.origin !== "https://nodebase.invalid") return fallback
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return fallback
  }
}

export function oauthStateCookieOptions(maxAge = OAUTH_STATE_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  }
}
