/**
 * AI Agent — System Constants
 *
 * Centralised limits, timeouts, and configuration values.
 * Change these to tune the system without touching business logic.
 */

// ─── Input Guardrails ──────────────────────────────────────────────────────

/** Maximum prompt length the AI agent will accept (characters) */
export const MAX_PROMPT_LENGTH = 4000;

/** Minimum prompt length before off-topic detection runs */
export const MIN_PROMPT_FOR_TOPIC_CHECK = 50;

// ─── Rate Limiting (per user, per tier) ───────────────────────────────────

export const RATE_LIMITS = {
  free: {
    perMinute: 10,
    perHour:   50,
    perDay:    100,
  },
  starter: {
    perMinute: 20,
    perHour:   150,
    perDay:    500,
  },
  pro: {
    perMinute: 30,
    perHour:   200,
    perDay:    1000,
  },
  enterprise: {
    perMinute: 100,
    perHour:   1000,
    perDay:    10000,
  },
} as const;

export type UserTier = keyof typeof RATE_LIMITS;

/** Redis key prefixes for rate limiting */
export const REDIS_KEYS = {
  rateLimitMinute: "ai-agent:min",
  rateLimitHour:   "ai-agent:hour",
  rateLimitDay:    "ai-agent:day",
  quotaDaily:      "ai-agent:quota:daily",
} as const;

/** Redis TTL values in seconds */
export const REDIS_TTL = {
  minute: 60,
  hour:   60 * 60,
  day:    60 * 60 * 24,
} as const;

// ─── Conversation ──────────────────────────────────────────────────────────

/** Maximum messages per conversation before a new one must be created */
export const MAX_MESSAGES_PER_CONVERSATION = 50;

/** Maximum number of messages fetched for LLM context window */
export const MAX_CONTEXT_MESSAGES = 20;

/** Maximum characters for the auto-generated conversation title */
export const MAX_TITLE_LENGTH = 60;

// ─── Node Canvas Layout ────────────────────────────────────────────────────

/** Starting X coordinate for the trigger node on the canvas */
export const CANVAS_TRIGGER_X = 250;
/** Starting Y coordinate for the trigger node on the canvas */
export const CANVAS_TRIGGER_Y = 100;
/** Vertical spacing between subsequent nodes */
export const CANVAS_NODE_Y_SPACING = 150;

// ─── System Prompts ────────────────────────────────────────────────────────

/** Token budget reserved for the structured output JSON */
export const OUTPUT_TOKEN_RESERVE = 4096;

// ─── Guardrail Confidence Thresholds ──────────────────────────────────────

export const GUARDRAIL_CONFIDENCE = {
  /** Regex pattern match — very high confidence */
  regexMatch: 0.95,
  /** Heuristic phrase match */
  heuristic:  0.70,
  /** Keyword absence + off-topic pattern */
  offTopic:   0.60,
} as const;

// ─── Template Library ──────────────────────────────────────────────────────

/** How many templates to return in a list query */
export const TEMPLATES_PER_PAGE = 12;
