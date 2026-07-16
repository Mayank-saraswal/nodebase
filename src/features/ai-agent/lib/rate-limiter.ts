/**
 * Rate Limiter & Usage Tracker
 *
 * Three-tier rate limiting (per-minute, per-hour, per-day) enforced via Redis.
 * Gracefully degrades (returns allowed: true) when Redis is unavailable — safe
 * for local development without an Upstash instance.
 *
 * Usage is also persisted to the `AgentUsage` Postgres table for billing,
 * analytics, and monthly quota reporting.
 */

import prisma from "@/lib/db";
import { RATE_LIMITS, REDIS_KEYS, REDIS_TTL, type UserTier } from "../config/constants";
import { AgentAIProviderType } from "../config/providers";

export interface RateLimitResult {
  allowed:   boolean;
  remaining: number;
  resetAt:   Date;
}

// ─── Redis Lazy Loader ─────────────────────────────────────────────────────

function getRedis() {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = require("@upstash/redis"); // eslint-disable-line @typescript-eslint/no-require-imports
  return new Redis({ url, token }) as import("@upstash/redis").Redis;
}

// ─── Rate Limiter ──────────────────────────────────────────────────────────

export class RateLimiter {

  async checkLimit(
    userId: string,
    tier:   UserTier = "free",
  ): Promise<RateLimitResult> {
    const redis  = getRedis();
    const limits = RATE_LIMITS[tier];

    if (!redis) {
      // Fail open — Redis not configured (local dev)
      return { allowed: true, remaining: limits.perDay, resetAt: this.endOfDay() };
    }

    const checks = [
      { key: `${REDIS_KEYS.rateLimitMinute}:${userId}`, limit: limits.perMinute, ttl: REDIS_TTL.minute },
      { key: `${REDIS_KEYS.rateLimitHour}:${userId}`,   limit: limits.perHour,   ttl: REDIS_TTL.hour   },
      { key: `${REDIS_KEYS.rateLimitDay}:${userId}`,    limit: limits.perDay,    ttl: REDIS_TTL.day    },
    ] as const;

    for (const { key, limit, ttl } of checks) {
      try {
        const count = await redis.incr(key);
        if (count === 1) await redis.expire(key, ttl);

        if (count > limit) {
          const pttl = await redis.pttl(key);
          return {
            allowed:   false,
            remaining: 0,
            resetAt:   new Date(Date.now() + Math.max(pttl, 0)),
          };
        }
      } catch {
        // Redis error — fail open for this check
      }
    }

    // Return remaining daily capacity
    try {
      const dayKey = `${REDIS_KEYS.rateLimitDay}:${userId}`;
      const used   = parseInt((await redis.get<string>(dayKey)) ?? "0", 10);
      return {
        allowed:   true,
        remaining: limits.perDay - used,
        resetAt:   this.endOfDay(),
      };
    } catch {
      return { allowed: true, remaining: limits.perDay, resetAt: this.endOfDay() };
    }
  }

  /**
   * Record token usage in the `AgentUsage` table.
   * Called after a successful generation to track costs and enforce monthly quotas.
   */
  async recordUsage(
    userId:   string,
    provider: AgentAIProviderType,
    tokens:   { input: number; output: number },
    success:  boolean,
  ) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const providerInputField  = this.tokenField(provider, "Input");
    const providerOutputField = this.tokenField(provider, "Output");

    try {
      await prisma.agentUsage.upsert({
        where:  { userId_date: { userId, date: today } },
        create: {
          userId,
          date:                     today,
          [providerInputField]:     tokens.input,
          [providerOutputField]:    tokens.output,
          generationsRequested:     1,
          generationsCompleted:     success ? 1 : 0,
          generationsFailed:        success ? 0 : 1,
        },
        update: {
          [providerInputField]:     { increment: tokens.input  },
          [providerOutputField]:    { increment: tokens.output },
          generationsRequested:     { increment: 1 },
          generationsCompleted:     success ? { increment: 1 } : undefined,
          generationsFailed:        success ? undefined : { increment: 1 },
        },
      });
    } catch (err) {
      // Non-fatal — log and continue
      console.error("[RateLimiter] Failed to record usage:", err);
    }
  }

  /** Get daily and monthly usage stats for a user. */
  async getUsageStats(userId: string) {
    const today      = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [daily, monthly] = await Promise.all([
      prisma.agentUsage.findUnique({
        where: { userId_date: { userId, date: today } },
      }),
      prisma.agentUsage.aggregate({
        where: { userId, date: { gte: monthStart } },
        _sum:  {
          openaiInputTokens:        true,
          openaiOutputTokens:       true,
          claudeInputTokens:        true,
          claudeOutputTokens:       true,
          digitaloceanInputTokens:  true,
          digitaloceanOutputTokens: true,
          generationsCompleted:     true,
          generationsFailed:        true,
        },
      }),
    ]);

    return { daily, monthly: monthly._sum };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private tokenField(provider: AgentAIProviderType, direction: "Input" | "Output"): string {
    const prefix: Record<AgentAIProviderType, string> = {
      [AgentAIProviderType.OPENAI]:            "openai",
      [AgentAIProviderType.CLAUDE]:            "claude",
      [AgentAIProviderType.DIGITALOCEAN_GLM5]: "digitalocean",
    };
    return `${prefix[provider]}${direction}Tokens`;
  }

  private endOfDay(): Date {
    const d = new Date();
    d.setUTCHours(23, 59, 59, 999);
    return d;
  }
}

export const rateLimiter = new RateLimiter();
