const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
const GITHUB_USERINFO_URL = "https://api.github.com/user"

export function getGithubClientId(): string {
  const id = process.env.GITHUB_CREDENTIALS_CLIENT_ID ?? ""
  if (!id) throw new Error("GitHub OAuth: GITHUB_CREDENTIALS_CLIENT_ID env var is not set")
  return id
}

export function getGithubClientSecret(): string {
  const secret = process.env.GITHUB_CREDENTIALS_CLIENT_SECRET ?? ""
  if (!secret) throw new Error("GitHub OAuth: GITHUB_CREDENTIALS_CLIENT_SECRET env var is not set")
  return secret
}

export function getGithubRedirectUri(): string {
  return (
    process.env.GITHUB_CREDENTIALS_REDIRECT_URI ??
    `${process.env.NEXTAUTH_URL ?? "https://nodebase.mayanksaraswal.in"}/api/auth/github/callback`
  )
}

export function buildGithubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getGithubClientId(),
    redirect_uri: getGithubRedirectUri(),
    scope: "repo workflow read:org user", // Scopes needed for most n8n GitHub features
    state,
  })
  return `${GITHUB_AUTH_URL}?${params.toString()}`
}

export interface GithubTokenResponse {
  access_token: string
  scope?: string
  token_type?: string
}

export async function exchangeGithubCodeForToken(code: string): Promise<GithubTokenResponse> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: getGithubClientId(),
      client_secret: getGithubClientSecret(),
      code,
      redirect_uri: getGithubRedirectUri(),
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`GitHub token exchange failed: ${err}`)
  }

  const data = await response.json()
  
  if (data.error) {
    throw new Error(`GitHub token error: ${data.error_description || data.error}`)
  }

  if (!data.access_token) {
    throw new Error("GitHub did not return an access_token.")
  }

  return data as GithubTokenResponse
}

export async function getGithubUserInfo(accessToken: string): Promise<{ login: string; id: number; avatar_url: string; email: string }> {
  const response = await fetch(GITHUB_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub user info")
  }

  return response.json()
}
