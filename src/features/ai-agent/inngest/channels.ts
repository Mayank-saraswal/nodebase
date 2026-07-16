/**
 * Inngest Realtime Channel — AI Agent Progress
 *
 * Provides real-time progress updates to the UI during background
 * AI generation jobs. Uses Inngest's realtime middleware to publish
 * status updates that the client can subscribe to.
 */

import { channel } from "@inngest/realtime";

/**
 * Channel for publishing AI agent generation progress.
 *
 * Events emitted:
 *   - status: "generating" | "validating" | "completed" | "failed"
 *   - progress: 0-100 percentage
 *   - message: Human-readable status message
 *   - workflow: Generated workflow (on completion)
 */
export const aiAgentChannel = () =>
  channel("ai-agent");

/**
 * Channel topic key for a specific user's AI agent events.
 * Used to scope realtime updates to the requesting user.
 */
export function getAiAgentTopic(userId: string): string {
  return `ai-agent:${userId}`;
}

/**
 * Progress message types that can be published during generation.
 */
export interface AiAgentProgressMessage {
  status:    "queued" | "generating" | "validating" | "completed" | "failed";
  progress:  number;
  message:   string;
  generationId?: string;
  workflow?:     unknown;
  error?:        string;
}
