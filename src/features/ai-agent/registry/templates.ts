/**
 * India-specific pre-built workflow templates.
 * These are surfaced in the AI agent UI as quick-start options.
 */

import { NodeType, CredentialType } from "@/generated/prisma";

export interface WorkflowTemplate {
  id:          string;
  name:        string;
  description: string;
  category:    string;
  tags:        string[];
  isIndiaSpecific: boolean;
  /** Compact preview shown in template cards */
  nodeTypes:   NodeType[];
  requiredCredentials: CredentialType[];
  /** Sample prompt the user can use to generate this workflow */
  samplePrompt: string;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id:          "razorpay-whatsapp-confirm",
    name:        "Razorpay Payment → WhatsApp Confirmation",
    description: "When a Razorpay payment is captured, send an instant WhatsApp confirmation to the customer.",
    category:    "payment",
    tags:        ["razorpay", "whatsapp", "payment", "india"],
    isIndiaSpecific: true,
    nodeTypes:   [NodeType.RAZORPAY_TRIGGER, NodeType.WHATSAPP],
    requiredCredentials: [CredentialType.RAZORPAY, CredentialType.WHATSAPP],
    samplePrompt: "When a Razorpay payment is captured, send a WhatsApp message to the customer confirming their payment with the order ID and amount.",
  },
  {
    id:          "razorpay-zoho-crm",
    name:        "Razorpay Payment → Zoho CRM Contact",
    description: "Create or update a Zoho CRM contact whenever a Razorpay payment succeeds.",
    category:    "payment",
    tags:        ["razorpay", "zoho", "crm", "india"],
    isIndiaSpecific: true,
    nodeTypes:   [NodeType.RAZORPAY_TRIGGER, NodeType.ZOHO_CRM],
    requiredCredentials: [CredentialType.RAZORPAY, CredentialType.ZOHO_CRM],
    samplePrompt: "When a Razorpay payment is captured, create a contact in Zoho CRM with the customer's name, email, and phone number.",
  },
  {
    id:          "whatsapp-openai-reply",
    name:        "WhatsApp Message → AI Reply",
    description: "Receive WhatsApp messages and automatically reply using OpenAI GPT-4.",
    category:    "ai",
    tags:        ["whatsapp", "openai", "chatbot", "india"],
    isIndiaSpecific: true,
    nodeTypes:   [NodeType.WHATSAPP_TRIGGER, NodeType.OPENAI, NodeType.WHATSAPP],
    requiredCredentials: [CredentialType.WHATSAPP, CredentialType.OPENAI],
    samplePrompt: "When a WhatsApp message is received, generate an intelligent reply using OpenAI and send it back to the sender.",
  },
  {
    id:          "schedule-sheets-report",
    name:        "Daily Report → Google Sheets",
    description: "Run a daily scheduled workflow to fetch data and append a report row to Google Sheets.",
    category:    "reporting",
    tags:        ["schedule", "google-sheets", "report"],
    isIndiaSpecific: false,
    nodeTypes:   [NodeType.SCHEDULE_TRIGGER, NodeType.HTTP_REQUEST, NodeType.GOOGLE_SHEETS],
    requiredCredentials: [CredentialType.GOOGLE_SHEETS],
    samplePrompt: "Every day at 9 AM, fetch sales data from my API and append a summary row to a Google Sheet.",
  },
  {
    id:          "webhook-slack-alert",
    name:        "Webhook → Slack Alert",
    description: "Receive a webhook event and post a formatted alert to a Slack channel.",
    category:    "alerting",
    tags:        ["webhook", "slack", "alert"],
    isIndiaSpecific: false,
    nodeTypes:   [NodeType.WEBHOOK_TRIGGER, NodeType.SLACK],
    requiredCredentials: [CredentialType.SLACK],
    samplePrompt: "When my server sends a webhook, post the alert details to our #incidents Slack channel.",
  },
  {
    id:          "github-slack-notify",
    name:        "GitHub PR → Slack Notification",
    description: "When a pull request is opened on GitHub, notify the team in Slack.",
    category:    "devops",
    tags:        ["github", "slack", "ci-cd"],
    isIndiaSpecific: false,
    nodeTypes:   [NodeType.GITHUB_TRIGGER, NodeType.SLACK],
    requiredCredentials: [CredentialType.GITHUB_APP, CredentialType.SLACK],
    samplePrompt: "When a new pull request is opened on my GitHub repository, send a Slack message to the #engineering channel with the PR title, author, and link.",
  },
  {
    id:          "msg91-otp-verify",
    name:        "MSG91 OTP Verification Flow",
    description: "Send OTP via MSG91 and verify it with a conditional branch.",
    category:    "authentication",
    tags:        ["msg91", "otp", "india", "verification"],
    isIndiaSpecific: true,
    nodeTypes:   [NodeType.WEBHOOK_TRIGGER, NodeType.MSG91, NodeType.IF_ELSE],
    requiredCredentials: [CredentialType.MSG91],
    samplePrompt: "When a user submits their phone number, send an OTP via MSG91 SMS and verify it in a follow-up webhook.",
  },
  {
    id:          "shiprocket-whatsapp-track",
    name:        "Shiprocket Shipment → WhatsApp Tracking",
    description: "When an order ships via Shiprocket, send the tracking link to the customer on WhatsApp.",
    category:    "logistics",
    tags:        ["shiprocket", "whatsapp", "logistics", "india"],
    isIndiaSpecific: true,
    nodeTypes:   [NodeType.WEBHOOK_TRIGGER, NodeType.SHIPROCKET, NodeType.WHATSAPP],
    requiredCredentials: [CredentialType.SHIPROCKET, CredentialType.WHATSAPP],
    samplePrompt: "When a Shiprocket order is shipped, fetch the tracking details and send the tracking link to the customer via WhatsApp.",
  },
  {
    id:          "form-hubspot-email",
    name:        "Form Submission → HubSpot + Gmail",
    description: "Create a HubSpot contact from a form submission and send a welcome email via Gmail.",
    category:    "crm",
    tags:        ["hubspot", "gmail", "lead", "form"],
    isIndiaSpecific: false,
    nodeTypes:   [NodeType.WEBHOOK_TRIGGER, NodeType.HUBSPOT, NodeType.GMAIL],
    requiredCredentials: [CredentialType.HUBSPOT, CredentialType.GMAIL_OAUTH],
    samplePrompt: "When someone submits our contact form, create a HubSpot contact and send them a welcome email from Gmail.",
  },
  {
    id:          "openai-notion-summary",
    name:        "AI Content Summarizer → Notion",
    description: "Fetch an article via HTTP, summarize it with OpenAI, and save to a Notion database.",
    category:    "ai",
    tags:        ["openai", "notion", "summarization"],
    isIndiaSpecific: false,
    nodeTypes:   [NodeType.MANUAL_TRIGGER, NodeType.HTTP_REQUEST, NodeType.OPENAI, NodeType.NOTION],
    requiredCredentials: [CredentialType.OPENAI, CredentialType.NOTION],
    samplePrompt: "Fetch the content of a URL, summarize it using OpenAI, and create a new page in my Notion database with the summary.",
  },
];

export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter((t) => t.category === category);
}

export function getIndiaTemplates(): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter((t) => t.isIndiaSpecific);
}

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}
