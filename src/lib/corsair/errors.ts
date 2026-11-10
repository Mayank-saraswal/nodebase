import { NonRetriableError, RetryAfterError } from "inngest"

/**
 * Map provider / Corsair failures into Inngest-friendly errors.
 * Prefer RetryAfter for rate limits and transient server errors.
 */
export function mapCorsairError(err: unknown, integration: string): never {
  const message = err instanceof Error ? err.message : String(err)
  const status = extractStatus(err)

  if (status === 401 || /unauthorized|invalid.?auth|expired|reconnect/i.test(message)) {
    throw new NonRetriableError(
      `${integration}: Authorization expired or invalid. Reconnect the integration.`,
    )
  }

  if (status === 403 || /insufficient.?permission|forbidden/i.test(message)) {
    throw new NonRetriableError(
      `${integration}: Insufficient permissions. Reconnect and approve required scopes.`,
    )
  }

  if (status === 429 || /rate.?limit|quota/i.test(message)) {
    const retryAfter = extractRetryAfter(err) ?? "60s"
    throw new RetryAfterError(
      `${integration}: Rate limit or quota exceeded.`,
      retryAfter,
    )
  }

  if (status !== null && status >= 500) {
    throw new RetryAfterError(
      `${integration}: Upstream server error (${status}).`,
      "60s",
    )
  }

  if (err instanceof NonRetriableError || err instanceof RetryAfterError) {
    throw err
  }

  throw new NonRetriableError(`${integration}: ${message}`)
}

function extractStatus(err: unknown): number | null {
  if (!err || typeof err !== "object") return null
  const o = err as Record<string, unknown>
  if (typeof o.status === "number") return o.status
  if (typeof o.statusCode === "number") return o.statusCode
  const response = o.response as Record<string, unknown> | undefined
  if (response && typeof response.status === "number") return response.status
  return null
}

function extractRetryAfter(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined
  const o = err as Record<string, unknown>
  if (typeof o.retryAfter === "string" || typeof o.retryAfter === "number") {
    return String(o.retryAfter)
  }
  return undefined
}
