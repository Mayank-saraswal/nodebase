function requireEnv(key: string): string {
  const v = process.env[key]
  if (!v || v.trim() === "")
    throw new Error(`Missing env: ${key}. Set in .env.local or Vercel settings.`)
  return v
}

// ── Legacy per-service helpers (kept for backward compat) ─────────────────
export function getGoogleGmailClientId() { return requireEnv("GOOGLE_GMAIL_CLIENT_ID") }
export function getGoogleGmailClientSecret() { return requireEnv("GOOGLE_GMAIL_CLIENT_SECRET") }
export function getNextAuthUrl() { return requireEnv("NEXTAUTH_URL") }
export function getGmailPubsubToken() { return process.env.GMAIL_PUBSUB_VERIFICATION_TOKEN ?? "" }
export function getGmailPubsubTopic() { return process.env.GMAIL_PUBSUB_TOPIC_NAME ?? "" }

// ── Unified Google OAuth client (tries GOOGLE_CLIENT_ID first) ───────────
function resolveGoogleClientId(): string {
  const id =
    process.env.GOOGLE_CLIENT_ID ??
    process.env.GOOGLE_GMAIL_CLIENT_ID ??
    process.env.GOOGLE_SHEETS_CLIENT_ID ??
    process.env.GOOGLE_DRIVE_CLIENT_ID ??
    ""
  if (!id) throw new Error("Missing Google OAuth client ID. Set GOOGLE_CLIENT_ID in .env.")
  return id
}

function resolveGoogleClientSecret(): string {
  const secret =
    process.env.GOOGLE_CLIENT_SECRET ??
    process.env.GOOGLE_GMAIL_CLIENT_SECRET ??
    process.env.GOOGLE_SHEETS_CLIENT_SECRET ??
    process.env.GOOGLE_DRIVE_CLIENT_SECRET ??
    ""
  if (!secret) throw new Error("Missing Google OAuth client secret. Set GOOGLE_CLIENT_SECRET in .env.")
  return secret
}

export function getUnifiedGoogleClientId() { return resolveGoogleClientId() }
export function getUnifiedGoogleClientSecret() { return resolveGoogleClientSecret() }
export function getGoogleOAuthRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.NEXTAUTH_URL ?? "https://nodebase.mayanksaraswal.in"}/api/auth/google/callback`
  )
}
