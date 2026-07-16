/**
 * Guardrails Engine
 *
 * Multi-layer input safety system:
 *   1. Length check
 *   2. Prompt injection detection (regex + heuristics)
 *   3. Off-topic detection (workflow keyword matching)
 *   4. Rate limiting (Redis — graceful degradation in dev)
 *   5. Daily quota enforcement (Redis — graceful degradation in dev)
 *
 * Redis is used only when both UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are present in the environment.
 * In local dev without Redis, all rate/quota checks pass automatically.
 */

import { GuardrailViolationType } from "@/features/executions/enums"
import { MAX_PROMPT_LENGTH, MIN_PROMPT_FOR_TOPIC_CHECK, REDIS_KEYS, REDIS_TTL, GUARDRAIL_CONFIDENCE } from "../config/constants";

export interface GuardrailResult {
  passed:         boolean;
  violationType?: GuardrailViolationType;
  /** low | medium | high | critical */
  severity:       "low" | "medium" | "high" | "critical";
  reason?:        string;
  /** Which sub-check caught this */
  detectedBy:     string;
  confidence?:    number;
}

// ─── Injection Patterns ────────────────────────────────────────────────────

const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all )?previous instructions/i,
  /ignore (all )?prior instructions/i,
  /disregard (all )?(previous|prior) instructions/i,
  /you are now\s+\w+/i,
  /act as if you are/i,
  /pretend you are/i,
  /roleplay as/i,
  /simulate being/i,
  /jailbreak/i,
  /DAN mode/i,
  /developer mode/i,
  /system override/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /```system/i,
  /###\s*system/i,
  /override (your )?programming/i,
  /bypass (your )?(safety|security)/i,
  /disable (your )?(safety|security)/i,
  /forget (your )?(training|instructions)/i,
  /you are a (different|new)/i,
];

const INJECTION_PHRASES = [
  "instead of creating a workflow",
  "don't create a workflow",
  "skip the workflow",
  "just answer",
  "just tell me",
  "not a workflow",
  "forget about workflow",
];

// ─── Off-topic Patterns ────────────────────────────────────────────────────

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /^(what is|how to|explain|teach me|write|help me write|can you write)\s/i,
  /recipe/i,
  /essay/i,
  /story/i,
  /poem/i,
  /song lyrics/i,
  /translate/i,
  /summarize (this|the)/i,
  /translate this/i,
  /homework/i,
  /code (challenge|problem)/i,
  /debug (this|my) code/i,
  /fix (this|my) code/i,
  /^(what|who|when|where|why|how) (is|are|was|were|do|does|did)\s/i,
];

const WORKFLOW_KEYWORDS = [
  "workflow", "automation", "trigger", "payment", "order", "email", "sms",
  "whatsapp", "notification", "crm", "customer", "lead", "contact", "deal",
  "razorpay", "cashfree", "stripe", "webhook", "schedule", "sheet", "notion",
  "slack", "telegram", "message", "send", "create", "update", "sync",
  "process", "when", "every", "after", "before", "if", "data", "github",
  "shiprocket", "zoho", "hubspot", "freshdesk", "msg91", "postgres",
];

// ─── Guardrails Engine ─────────────────────────────────────────────────────

export class GuardrailsEngine {

  async validateInput(input: string, userId: string): Promise<GuardrailResult> {
    // 1. Length check
    if (input.length > MAX_PROMPT_LENGTH) {
      return {
        passed:        false,
        violationType: "EXCESSIVE_LENGTH" as GuardrailViolationType,
        severity:      "low",
        reason:        `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters. Please shorten your request.`,
        detectedBy:    "length_check",
      };
    }

    // 2. Prompt injection
    const injectionResult = this.detectPromptInjection(input);
    if (!injectionResult.passed) return injectionResult;

    // 3. Off-topic
    const offTopicResult = this.detectOffTopic(input);
    if (!offTopicResult.passed) return offTopicResult;

    // 4. Rate limit (Redis, fail-open)
    const rateLimitResult = await this.checkRateLimit(userId);
    if (!rateLimitResult.passed) return rateLimitResult;

    // 5. Daily quota (Redis, fail-open)
    const quotaResult = await this.checkDailyQuota(userId);
    if (!quotaResult.passed) return quotaResult;

    return { passed: true, severity: "low", detectedBy: "none" };
  }

  // ─── Private Checks ─────────────────────────────────────────────────────

  private detectPromptInjection(input: string): GuardrailResult {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        return {
          passed:        false,
          violationType: "PROMPT_INJECTION" as GuardrailViolationType,
          severity:      "critical",
          reason:        "Potential prompt injection detected. Please rephrase your workflow request.",
          detectedBy:    "regex",
          confidence:    GUARDRAIL_CONFIDENCE.regexMatch,
        };
      }
    }

    const lower = input.toLowerCase();
    for (const phrase of INJECTION_PHRASES) {
      if (lower.includes(phrase)) {
        return {
          passed:        false,
          violationType: "PROMPT_INJECTION" as GuardrailViolationType,
          severity:      "high",
          reason:        "Request appears to bypass workflow generation. Please describe a workflow you want to build.",
          detectedBy:    "heuristic",
          confidence:    GUARDRAIL_CONFIDENCE.heuristic,
        };
      }
    }

    return { passed: true, severity: "low", detectedBy: "regex" };
  }

  private detectOffTopic(input: string): GuardrailResult {
    if (input.length < MIN_PROMPT_FOR_TOPIC_CHECK) {
      return { passed: true, severity: "low", detectedBy: "heuristic" };
    }

    const lower = input.toLowerCase();
    const hasWorkflowKeyword = WORKFLOW_KEYWORDS.some((kw) => lower.includes(kw));
    if (hasWorkflowKeyword) {
      return { passed: true, severity: "low", detectedBy: "heuristic" };
    }

    for (const pattern of OFF_TOPIC_PATTERNS) {
      if (pattern.test(input)) {
        return {
          passed:        false,
          violationType: "OFF_TOPIC" as GuardrailViolationType,
          severity:      "medium",
          reason:        "Request appears unrelated to workflow automation. Describe an automation you'd like to create.",
          detectedBy:    "heuristic",
          confidence:    GUARDRAIL_CONFIDENCE.offTopic,
        };
      }
    }

    return { passed: true, severity: "low", detectedBy: "heuristic" };
  }

  private async checkRateLimit(userId: string): Promise<GuardrailResult> {
    const redis = this.getRedis();
    if (!redis) return { passed: true, severity: "low", detectedBy: "rate_limit" };

    try {
      const key   = `${REDIS_KEYS.rateLimitMinute}:${userId}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, REDIS_TTL.minute);

      if (count > 10) {
        return {
          passed:        false,
          violationType: "RATE_LIMITED" as GuardrailViolationType,
          severity:      "medium",
          reason:        "You're sending requests too quickly. Please wait a moment and try again.",
          detectedBy:    "rate_limit",
          confidence:    1,
        };
      }
    } catch {
      // Redis unavailable — fail open
    }

    return { passed: true, severity: "low", detectedBy: "rate_limit" };
  }

  private async checkDailyQuota(userId: string): Promise<GuardrailResult> {
    const redis = this.getRedis();
    if (!redis) return { passed: true, severity: "low", detectedBy: "quota_check" };

    try {
      const today = new Date().toISOString().slice(0, 10);
      const key   = `${REDIS_KEYS.quotaDaily}:${userId}:${today}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, REDIS_TTL.day);

      const DAILY_LIMIT = 50; // free tier default
      if (count > DAILY_LIMIT) {
        return {
          passed:        false,
          violationType: "QUOTA_EXCEEDED" as GuardrailViolationType,
          severity:      "high",
          reason:        `Daily generation quota exceeded (${DAILY_LIMIT}/day). Upgrade your plan for higher limits.`,
          detectedBy:    "quota_check",
          confidence:    1,
        };
      }
    } catch {
      // Redis unavailable — fail open
    }

    return { passed: true, severity: "low", detectedBy: "quota_check" };
  }

  /** Validate AI output for PII or harmful content (extensible hook). */
  validateOutput(_output: unknown): GuardrailResult {
    return { passed: true, severity: "low", detectedBy: "output_validation" };
  }

  // ─── Redis Singleton ─────────────────────────────────────────────────────

  private getRedis() {
    const url   = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;

    // Lazy import to avoid loading Redis in environments that don't have it
    const { Redis } = require("@upstash/redis"); // eslint-disable-line @typescript-eslint/no-require-imports
    return new Redis({ url, token });
  }
}
