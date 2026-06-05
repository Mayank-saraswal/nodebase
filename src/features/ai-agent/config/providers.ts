/**
 * AI Provider Configuration
 *
 * Defines each supported AI provider for the Nodebase AI Agent.
 * OpenAI is the default. Users can switch to DigitalOcean GLM-5 or Claude
 * via their AIPreference settings.
 *
 * Note: This is separate from the AIProvider enum used for workflow
 * execution nodes (OpenAI/Anthropic/Gemini nodes). This governs only
 * the AI Agent generation layer.
 */

export enum AgentAIProviderType {
  OPENAI            = "OPENAI",
  CLAUDE            = "CLAUDE",
  DIGITALOCEAN_GLM5 = "DIGITALOCEAN_GLM5",
}

export interface AIProviderConfig {
  id:           AgentAIProviderType;
  name:         string;
  displayName:  string;
  defaultModel: string;
  maxTokens:    number;
  /** USD cost per 1k input tokens */
  costPer1kInputTokens:  number;
  /** USD cost per 1k output tokens */
  costPer1kOutputTokens: number;
  endpoint:     string;
  apiKeyEnvVar: string;
  /** Used as the system default until user overrides */
  isDefault:    boolean;
  capabilities: {
    structuredOutput: boolean;
    vision:           boolean;
    multiTurn:        boolean;
  };
}

export const PROVIDER_CONFIGS: Record<AgentAIProviderType, AIProviderConfig> = {
  [AgentAIProviderType.OPENAI]: {
    id:           AgentAIProviderType.OPENAI,
    name:         "openai",
    displayName:  "OpenAI GPT-4o",
    defaultModel: "gpt-4o",
    maxTokens:    128000,
    costPer1kInputTokens:  0.0025,
    costPer1kOutputTokens: 0.01,
    endpoint:     "https://api.openai.com/v1/chat/completions",
    apiKeyEnvVar: "OPENAI_API_KEY",
    isDefault:    true,
    capabilities: { structuredOutput: true, vision: true, multiTurn: true },
  },

  [AgentAIProviderType.DIGITALOCEAN_GLM5]: {
    id:           AgentAIProviderType.DIGITALOCEAN_GLM5,
    name:         "digitalocean-glm5",
    displayName:  "GLM-5 (DigitalOcean AI)",
    defaultModel: "glm-5",
    maxTokens:    128000,
    costPer1kInputTokens:  0.0001,
    costPer1kOutputTokens: 0.0001,
    endpoint:     "https://inference.do-ai.run/v1/chat/completions",
    apiKeyEnvVar: "DIGITALOCEAN_AI_API_KEY",
    isDefault:    false,
    capabilities: { structuredOutput: true, vision: false, multiTurn: true },
  },

  [AgentAIProviderType.CLAUDE]: {
    id:           AgentAIProviderType.CLAUDE,
    name:         "claude",
    displayName:  "Claude Sonnet 4",
    defaultModel: "claude-sonnet-4-0",
    maxTokens:    200000,
    costPer1kInputTokens:  0.003,
    costPer1kOutputTokens: 0.015,
    endpoint:     "https://api.anthropic.com/v1/messages",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    isDefault:    false,
    capabilities: { structuredOutput: true, vision: true, multiTurn: true },
  },
};

/**
 * Returns the ordered provider priority list:
 * User preference → OpenAI (default) → remaining providers
 */
export function getProviderPriority(
  userPreference?: AgentAIProviderType,
): AgentAIProviderType[] {
  const all = Object.values(AgentAIProviderType);

  if (userPreference) {
    return [
      userPreference,
      ...all.filter((p) => p !== userPreference),
    ];
  }

  // System default: OpenAI first, then DO GLM-5, then Claude
  return [
    AgentAIProviderType.OPENAI,
    AgentAIProviderType.DIGITALOCEAN_GLM5,
    AgentAIProviderType.CLAUDE,
  ];
}

/**
 * Maps AgentAIProviderType → the DB enum string stored in Prisma.
 * They are identical strings, so this is a passthrough — but kept
 * explicit for compile-time safety.
 */
export function toDbProvider(provider: AgentAIProviderType): string {
  return provider;
}
