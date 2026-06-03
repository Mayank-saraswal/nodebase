

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

// ── Config resolution (new unified var, falls back to service-specific) ──

export function getGoogleClientId(type?: string): string {
  if (type === "GMAIL" && process.env.GOOGLE_GMAIL_CLIENT_ID) return process.env.GOOGLE_GMAIL_CLIENT_ID
  if (type === "GOOGLE_SHEETS" && process.env.GOOGLE_SHEETS_CLIENT_ID) return process.env.GOOGLE_SHEETS_CLIENT_ID
  if (type === "GOOGLE_DRIVE" && process.env.GOOGLE_DRIVE_CLIENT_ID) return process.env.GOOGLE_DRIVE_CLIENT_ID

  const id =
    process.env.GOOGLE_CLIENT_ID ??
    process.env.GOOGLE_GMAIL_CLIENT_ID ??
    process.env.GOOGLE_SHEETS_CLIENT_ID ??
    process.env.GOOGLE_DRIVE_CLIENT_ID ??
    ""
  if (!id) throw new Error("Google OAuth: GOOGLE_CLIENT_ID env var is not set")
  return id
}

export function getGoogleClientSecret(type?: string): string {
  if (type === "GMAIL" && process.env.GOOGLE_GMAIL_CLIENT_SECRET) return process.env.GOOGLE_GMAIL_CLIENT_SECRET
  if (type === "GOOGLE_SHEETS" && process.env.GOOGLE_SHEETS_CLIENT_SECRET) return process.env.GOOGLE_SHEETS_CLIENT_SECRET
  if (type === "GOOGLE_DRIVE" && process.env.GOOGLE_DRIVE_CLIENT_SECRET) return process.env.GOOGLE_DRIVE_CLIENT_SECRET

  const secret =
    process.env.GOOGLE_CLIENT_SECRET ??
    process.env.GOOGLE_GMAIL_CLIENT_SECRET ??
    process.env.GOOGLE_SHEETS_CLIENT_SECRET ??
    process.env.GOOGLE_DRIVE_CLIENT_SECRET ??
    ""
  if (!secret) throw new Error("Google OAuth: GOOGLE_CLIENT_SECRET env var is not set")
  return secret
}

export function getGoogleRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.NEXTAUTH_URL ?? "https://nodebase.mayanksaraswal.in"}/api/auth/google/callback`
  )
}

export function getGoogleScopes(type?: string): string {
  const allScopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ]

  if (type === "GMAIL" || type === "GMAIL_OAUTH") {
    allScopes.push(
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
      "https://mail.google.com/"
    )
  } else if (type === "GOOGLE_SHEETS") {
    allScopes.push("https://www.googleapis.com/auth/spreadsheets")
  } else if (type === "GOOGLE_DRIVE") {
    allScopes.push("https://www.googleapis.com/auth/drive")
  } else {
    // Fallback: request all known scopes together using the primary client
    allScopes.push(
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
      "https://mail.google.com/",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive"
    )
  }

  return allScopes.join(" ")
}

// ── Generate OAuth2 authorization URL ────────────────────────────────────

export function buildGoogleAuthUrl(state: string, type?: string): string {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(type),
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: getGoogleScopes(type),
    access_type: "offline",
    prompt: "consent", // Always show consent to ensure refresh_token is returned
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// ── Exchange authorization code for tokens ────────────────────────────────

export interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
  id_token?: string
}

export async function exchangeCodeForTokens(code: string, type?: string): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getGoogleClientId(type),
      client_secret: getGoogleClientSecret(type),
      redirect_uri: getGoogleRedirectUri(),
      grant_type: "authorization_code",
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Google token exchange failed: ${err}`)
  }

  const tokens = (await response.json()) as GoogleTokenResponse

  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh_token. " +
        "Make sure 'access_type=offline' and 'prompt=consent' are set. " +
        "If you previously authorized this app, revoke access at " +
        "https://myaccount.google.com/permissions and try again."
    )
  }

  return tokens
}

// ── Refresh access token using stored refresh_token ──────────────────────

export async function refreshGoogleAccessToken(
  refreshToken: string,
  issuingClientId?: string
): Promise<string> {
  // Use the issuing client if known, otherwise fall back to primary
  const clientId = issuingClientId ?? getGoogleClientId()
  const clientSecret = resolveClientSecretForId(clientId)

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (response.ok) {
    const data = (await response.json()) as { access_token: string; expires_in: number }
    return data.access_token
  }

  const lastStatus = response.status
  const lastError = await response.text()

  if (lastStatus === 400 || lastStatus === 401) {
    throw new Error(
      "Google refresh token is invalid or revoked. " +
        "Please reconnect your Google account in Settings → Credentials. Response: " + lastError
    )
  }
  throw new Error(`Failed to refresh Google access token: ${lastError}`)
}

function resolveClientSecretForId(clientId: string): string {
  const lookup: Array<[string | undefined, string | undefined]> = [
    [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET],
    [process.env.GOOGLE_GMAIL_CLIENT_ID, process.env.GOOGLE_GMAIL_CLIENT_SECRET],
    [process.env.GOOGLE_SHEETS_CLIENT_ID, process.env.GOOGLE_SHEETS_CLIENT_SECRET],
    [process.env.GOOGLE_DRIVE_CLIENT_ID, process.env.GOOGLE_DRIVE_CLIENT_SECRET],
  ]
  for (const [id, secret] of lookup) {
    if (id === clientId) {
      if (!secret) throw new Error(
        `Google OAuth: client secret is not set for client ${clientId}. ` +
        `Check your environment variables.`
      )
      return secret
    }
  }
  // clientId not recognized — use primary client
  return getGoogleClientSecret()
}

// ── Get user info (email, name, picture) ─────────────────────────────────

export async function getGoogleUserInfo(accessToken: string): Promise<{
  email: string
  name: string
  picture: string
  id: string
}> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error("Failed to fetch Google user info")
  }

  return response.json() as Promise<{ email: string; name: string; picture: string; id: string }>
}

// ── Extract refresh token from any credential format ─────────────────────
// Supports new OAuth2 format { refreshToken } and gives clear error for old formats

export function extractRefreshToken(decryptedValue: string): {
  refreshToken: string
  clientId?: string
} {
  try {
    const parsed = JSON.parse(decryptedValue) as {
      refreshToken?: string
      refresh_token?: string
      clientId?: string
      appPassword?: string
    }

    if (parsed.appPassword) {
      throw new Error(
        "This credential uses the old App Password format. " +
          "Please delete it and reconnect your Google account using 'Connect with Google'."
      )
    }

    const rt = parsed.refreshToken ?? parsed.refresh_token
    if (rt) {
      return {
        refreshToken: rt,
        clientId: parsed.clientId,
      }
    }
    throw new Error("No refresh token found in credential")
  } catch (e) {
    if (e instanceof Error && e.message.includes("App Password")) throw e
    if (e instanceof Error && e.message.includes("No refresh token")) throw e
    // Plain string — legacy format
    throw new Error(
      "Invalid credential format. " +
        "Please delete it and reconnect using 'Connect with Google' in Settings → Credentials."
    )
  }
}

