/**
 * AI Provider Gateway
 *
 * Responsible for instantiating the correct Vercel AI SDK LanguageModel
 * for a given provider. Handles the fallback chain automatically:
 *   User preference → OpenAI → DigitalOcean GLM-5 → Claude
 *
 * Uses the existing @ai-sdk/openai and @ai-sdk/anthropic packages already
 * in the project's package.json. No new installs required.
 */

import { createOpenAI }    from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

import {
  AgentAIProviderType,
  PROVIDER_CONFIGS,
  getProviderPriority,
} from "../config/providers";

// ─── Health Cache ──────────────────────────────────────────────────────────
// Prevent hammering unavailable providers on every request.
// Cache "down" status for 60 seconds.

interface HealthStatus {
  status: "up" | "down";
  checkedAt: number;
}

const healthCache = new Map<AgentAIProviderType, HealthStatus>();
const HEALTH_CACHE_TTL_MS = 60_000; // 60 seconds

// ─── Gateway Class ─────────────────────────────────────────────────────────

export class AIProviderGateway {
  /**
   * Returns the best available LanguageModel for the given user preference.
   * Tries providers in priority order, skipping any that are known to be down.
   *
   * @throws if all providers are unavailable or unconfigured.
   */
  async getModel(
    userPreference?: AgentAIProviderType,
  ): Promise<{ model: LanguageModel; provider: AgentAIProviderType }> {
    const order = getProviderPriority(userPreference);

    for (const providerType of order) {
      // Skip if cached as down
      if (this.isKnownDown(providerType)) continue;

      const config = PROVIDER_CONFIGS[providerType];
      const apiKey = process.env[config.apiKeyEnvVar];

      // Skip if no key configured
      if (!apiKey || apiKey.trim() === "") continue;

      try {
        const model = this.createModel(providerType, apiKey);
        return { model, provider: providerType };
      } catch (err) {
        console.warn(`[AIProviderGateway] Failed to create model for ${providerType}:`, err);
        this.markDown(providerType);
      }
    }

    throw new Error(
      "No AI provider is available. Configure at least OPENAI_API_KEY in your environment.",
    );
  }

  /**
   * Creates a LanguageModel instance for the specified provider.
   * Uses the OpenAI-compatible SDK for both OpenAI and DigitalOcean,
   * and Anthropic SDK for Claude.
   */
  private createModel(
    providerType: AgentAIProviderType,
    apiKey: string,
  ): LanguageModel {
    const config = PROVIDER_CONFIGS[providerType];

    switch (providerType) {
      case AgentAIProviderType.OPENAI:
        return createOpenAI({ apiKey })(config.defaultModel);

      case AgentAIProviderType.DIGITALOCEAN_GLM5:
        // DigitalOcean AI uses an OpenAI-compatible REST interface
        return createOpenAI({
          apiKey,
          baseURL: "https://inference.do-ai.run/v1",
        })(config.defaultModel);

      case AgentAIProviderType.CLAUDE:
        return createAnthropic({ apiKey })(config.defaultModel);

      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }
  }

  // ─── Health Helpers ──────────────────────────────────────────────────────

  private isKnownDown(provider: AgentAIProviderType): boolean {
    const entry = healthCache.get(provider);
    if (!entry) return false;
    if (Date.now() - entry.checkedAt > HEALTH_CACHE_TTL_MS) {
      healthCache.delete(provider);
      return false;
    }
    return entry.status === "down";
  }

  private markDown(provider: AgentAIProviderType): void {
    healthCache.set(provider, { status: "down", checkedAt: Date.now() });
  }

  /** Manually clear the health cache (useful in tests). */
  clearHealthCache(): void {
    healthCache.clear();
  }
}

// Singleton export — safe to use across the request lifecycle
export const aiProviderGateway = new AIProviderGateway();
