import type { GuardrailResult } from "./guardrails";
import { MAX_PROMPT_LENGTH } from "../config/constants";

/**
 * Returns a helpful, user-friendly message when a guardrail blocks a request.
 */
export function getGuardrailResponse(result: GuardrailResult): string {
  switch (result.violationType) {
    case "PROMPT_INJECTION":
      return `🛡️ I'm designed specifically to help create workflows. Your request appears to contain instructions that don't relate to workflow creation.

**Try something like:**
- "Create a workflow that sends a WhatsApp message when a Razorpay payment is received"
- "Build an automation that adds Google Form submissions to a Google Sheet"
- "Make a workflow that creates a Zoho CRM contact when someone fills a form"`;

    case "OFF_TOPIC":
      return `🤖 I'm **Nodebase AI**, your workflow creation assistant. I help you build automations for your business.

Your request doesn't seem to be about creating a workflow. Here's what I can help with:
- 💳 Payment workflows (Razorpay, Cashfree)
- 📱 Customer communication (WhatsApp, Email, SMS via MSG91)
- 🏢 CRM automation (Zoho CRM, HubSpot, Freshdesk)
- 📊 Data sync (Google Sheets, Notion, PostgreSQL)
- 🤖 AI-powered workflows (OpenAI, Claude, Gemini)
- 🚚 Logistics (Shiprocket tracking and labels)`;

    case "RATE_LIMITED":
      return `⏳ You're sending requests too quickly. Please wait a moment and try again.\n\nYou can make up to **10 requests per minute**.`;

    case "QUOTA_EXCEEDED":
      return `📊 You've reached your daily workflow generation limit.

**Upgrade to Nodebase Pro for:**
- Unlimited AI workflow generations
- Priority processing with GPT-4o
- Access to all 10+ India-specific templates
- Advanced workflow debugging`;

    case "EXCESSIVE_LENGTH":
      return `📝 Your request is too long (max ${MAX_PROMPT_LENGTH} characters). Please describe your workflow more concisely.\n\n**Tip:** Focus on the trigger event and the action you want to perform.`;

    case "HARMFUL_CONTENT":
      return `❌ Your request was flagged for potentially harmful content and cannot be processed.`;

    case "PII_DETECTED":
      return `🔒 Personal information was detected in your request. Please remove sensitive data like email addresses, phone numbers, or API keys before submitting.`;

    default:
      return `❌ Your request couldn't be processed. Please try rephrasing it as a workflow automation request.`;
  }
}
