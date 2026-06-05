import { NodeType, CredentialType } from "@/generated/prisma";

export interface NodeCapability {
  type: NodeType;
  category: "trigger" | "execution" | "logic" | "ai" | "communication" | "integration" | "productivity";
  label: string;
  description: string;
  operations?: string[];
  requiredCredential?: CredentialType;
  credentialPurpose?: string;
  outputVariables: Array<{ name: string; description: string; example: string }>;
  maxInputs: number;
  maxOutputs: number;
  isIndiaSpecific?: boolean;
  useCases: string[];
  exampleData?: string;
}

export const TRIGGER_NODES: NodeCapability[] = [
  {
    type: NodeType.MANUAL_TRIGGER, category: "trigger", label: "Manual Trigger",
    description: "Runs the workflow when user clicks execute",
    outputVariables: [{ name: "manualTrigger", description: "Empty starter object", example: "{}" }],
    maxInputs: 0, maxOutputs: 1, useCases: ["testing", "on-demand"],
  },
  {
    type: NodeType.SCHEDULE_TRIGGER, category: "trigger", label: "Schedule Trigger",
    description: "Run workflow on a cron schedule",
    outputVariables: [{ name: "scheduleTrigger.timestamp", description: "Execution time", example: "2026-06-05T10:00:00Z" }],
    maxInputs: 0, maxOutputs: 1, useCases: ["daily reports", "periodic sync"],
  },
  {
    type: NodeType.WEBHOOK_TRIGGER, category: "trigger", label: "Webhook Trigger",
    description: "Trigger via HTTP POST to a unique URL",
    outputVariables: [
      { name: "webhookTrigger.body", description: "Request body", example: "{...}" },
      { name: "webhookTrigger.headers", description: "Request headers", example: "{...}" },
    ],
    maxInputs: 0, maxOutputs: 1, useCases: ["external integrations", "API callbacks"],
  },
  {
    type: NodeType.RAZORPAY_TRIGGER, category: "trigger", label: "Razorpay Trigger",
    description: "Fires on Razorpay events (payment.captured, order.paid, etc.)",
    requiredCredential: CredentialType.RAZORPAY, credentialPurpose: "Razorpay Key ID and Secret",
    operations: ["payment.captured", "payment.failed", "order.paid", "refund.created", "subscription.created"],
    outputVariables: [
      { name: "razorpayTrigger.payload.payment.entity.id", description: "Payment ID", example: "pay_xxx" },
      { name: "razorpayTrigger.payload.payment.entity.amount", description: "Amount in paise", example: "50000" },
      { name: "razorpayTrigger.payload.payment.entity.email", description: "Customer email", example: "user@example.com" },
      { name: "razorpayTrigger.payload.payment.entity.contact", description: "Customer phone", example: "+919876543210" },
    ],
    maxInputs: 0, maxOutputs: 1, isIndiaSpecific: true, useCases: ["payment confirmation", "order fulfillment"],
  },
  {
    type: NodeType.WHATSAPP_TRIGGER, category: "trigger", label: "WhatsApp Trigger",
    description: "Fires when a WhatsApp message is received",
    requiredCredential: CredentialType.WHATSAPP, credentialPurpose: "WhatsApp Business API token",
    outputVariables: [
      { name: "whatsappTrigger.message.from", description: "Sender phone", example: "919876543210" },
      { name: "whatsappTrigger.message.text.body", description: "Message text", example: "Hello" },
    ],
    maxInputs: 0, maxOutputs: 1, isIndiaSpecific: true, useCases: ["customer support", "chatbot", "lead capture"],
  },
  {
    type: NodeType.GITHUB_TRIGGER, category: "trigger", label: "GitHub Trigger",
    description: "Fires on GitHub events (push, pull_request, issues)",
    requiredCredential: CredentialType.GITHUB_APP, credentialPurpose: "GitHub App or Personal Access Token",
    outputVariables: [
      { name: "githubTrigger.event", description: "Event type", example: "push" },
      { name: "githubTrigger.repository", description: "Repository name", example: "owner/repo" },
    ],
    maxInputs: 0, maxOutputs: 1, useCases: ["CI/CD", "issue automation", "PR workflows"],
  },
  {
    type: NodeType.CASHFREE_TRIGGER, category: "trigger", label: "Cashfree Trigger",
    description: "Fires on Cashfree payment gateway events",
    requiredCredential: CredentialType.CASHFREE, credentialPurpose: "Cashfree App ID and Secret Key",
    outputVariables: [
      { name: "cashfreeTrigger.data.order.order_id", description: "Order ID", example: "order_xxx" },
      { name: "cashfreeTrigger.data.payment.payment_status", description: "Payment status", example: "SUCCESS" },
    ],
    maxInputs: 0, maxOutputs: 1, isIndiaSpecific: true, useCases: ["payment processing", "order management"],
  },
  {
    type: NodeType.ERROR_TRIGGER, category: "trigger", label: "Error Trigger",
    description: "Fires when another workflow execution fails",
    outputVariables: [
      { name: "errorTrigger.error.message", description: "Error message", example: "Node failed" },
      { name: "errorTrigger.workflowId", description: "Failed workflow ID", example: "cuid_xxx" },
    ],
    maxInputs: 0, maxOutputs: 1, useCases: ["error handling", "alerting on failures"],
  },
];

export const EXECUTION_NODES: NodeCapability[] = [
  {
    type: NodeType.HTTP_REQUEST, category: "execution", label: "HTTP Request",
    description: "Make HTTP requests to any API endpoint",
    operations: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    outputVariables: [
      { name: "httpRequest.response", description: "Response body", example: "{...}" },
      { name: "httpRequest.status", description: "HTTP status code", example: "200" },
    ],
    maxInputs: 1, maxOutputs: 1, useCases: ["API calls", "webhook responses", "data fetching"],
    exampleData: '{"method": "GET", "url": "https://api.example.com", "body": "{}", "headers": "{}"}',
  },
  {
    type: NodeType.CODE, category: "execution", label: "Code",
    description: "Run custom JavaScript/TypeScript code",
    outputVariables: [{ name: "code.result", description: "Code output", example: "{...}" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["data transformation", "custom logic", "calculations"],
  },
  {
    type: NodeType.SET_VARIABLE, category: "execution", label: "Set Variable",
    description: "Set or transform variables for downstream nodes",
    outputVariables: [{ name: "setVariable.output", description: "Set values", example: "{...}" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["data mapping", "variable assignment"],
  },
  {
    type: NodeType.WAIT, category: "execution", label: "Wait",
    description: "Pause workflow execution for a specified duration",
    outputVariables: [{ name: "wait.resumedAt", description: "Resume timestamp", example: "2026-06-05T10:05:00Z" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["delays", "scheduled retries"],
  },
  {
    type: NodeType.MEDIA_UPLOAD, category: "execution", label: "Media Upload",
    description: "Upload media files to cloud storage",
    outputVariables: [
      { name: "mediaUpload.url", description: "Public file URL", example: "https://cdn.example.com/file.pdf" },
    ],
    maxInputs: 1, maxOutputs: 1, useCases: ["file uploads", "document storage"],
  },
];

export const COMMUNICATION_NODES: NodeCapability[] = [
  {
    type: NodeType.GMAIL, category: "communication", label: "Gmail",
    description: "Send and manage emails via Gmail API",
    requiredCredential: CredentialType.GMAIL_OAUTH, credentialPurpose: "Google OAuth2 for Gmail access",
    operations: ["SEND", "REPLY", "FORWARD", "GET_MESSAGE", "SEARCH_MESSAGES"],
    outputVariables: [{ name: "gmail.messageId", description: "Email message ID", example: "msgxxx" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["email automation", "notifications", "follow-ups"],
    exampleData: '{"operation": "SEND", "to": "user@example.com", "subject": "Hello", "body": "Message"}',
  },
  {
    type: NodeType.WHATSAPP, category: "communication", label: "WhatsApp",
    description: "Send WhatsApp messages via Meta Business API",
    requiredCredential: CredentialType.WHATSAPP, credentialPurpose: "WhatsApp Business API token",
    operations: ["SEND_TEXT", "SEND_IMAGE", "SEND_DOCUMENT", "SEND_TEMPLATE"],
    outputVariables: [{ name: "whatsapp.messageId", description: "Sent message ID", example: "wamid.xxx" }],
    maxInputs: 1, maxOutputs: 1, isIndiaSpecific: true, useCases: ["notifications", "confirmations", "alerts"],
  },
  {
    type: NodeType.SLACK, category: "communication", label: "Slack",
    description: "Send messages, manage channels in Slack",
    requiredCredential: CredentialType.SLACK, credentialPurpose: "Slack Bot Token",
    operations: ["MESSAGE_SEND", "MESSAGE_SEND_WEBHOOK", "CHANNEL_LIST"],
    outputVariables: [{ name: "slack.ts", description: "Message timestamp", example: "1234567890.123456" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["team notifications", "incident alerts"],
  },
  {
    type: NodeType.TELEGRAM, category: "communication", label: "Telegram",
    description: "Send messages to Telegram chats and channels",
    operations: ["SEND_MESSAGE", "SEND_PHOTO", "SEND_DOCUMENT"],
    outputVariables: [{ name: "telegram.messageId", description: "Message ID", example: "123" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["team notifications", "alerts", "bot messages"],
  },
  {
    type: NodeType.MSG91, category: "communication", label: "MSG91",
    description: "SMS, OTP, WhatsApp, Voice — India's leading communication platform",
    requiredCredential: CredentialType.MSG91, credentialPurpose: "MSG91 API key",
    operations: ["SEND_SMS", "SEND_OTP", "VERIFY_OTP", "SEND_WHATSAPP", "SEND_BULK_SMS"],
    outputVariables: [{ name: "msg91.requestId", description: "Request ID", example: "xxx" }],
    maxInputs: 1, maxOutputs: 1, isIndiaSpecific: true, useCases: ["SMS notifications", "OTP verification", "bulk messaging"],
  },
];

export const AI_NODES: NodeCapability[] = [
  {
    type: NodeType.OPENAI, category: "ai", label: "OpenAI",
    description: "GPT-4 for chat, structured output, image generation, embeddings",
    requiredCredential: CredentialType.OPENAI, credentialPurpose: "OpenAI API key",
    operations: ["CHAT", "STRUCTURED_OUTPUT", "GENERATE_IMAGE", "EMBED", "TRANSCRIBE"],
    outputVariables: [{ name: "openai.text", description: "Generated text", example: "AI response..." }],
    maxInputs: 1, maxOutputs: 1, useCases: ["content generation", "summarization", "AI chat"],
  },
  {
    type: NodeType.ANTHROPIC, category: "ai", label: "Claude (Anthropic)",
    description: "Claude for advanced reasoning, analysis, and long-context tasks",
    requiredCredential: CredentialType.ANTHROPIC, credentialPurpose: "Anthropic API key",
    operations: ["CHAT"],
    outputVariables: [{ name: "anthropic.text", description: "Generated text", example: "AI response..." }],
    maxInputs: 1, maxOutputs: 1, useCases: ["analysis", "writing", "reasoning tasks"],
  },
  {
    type: NodeType.GEMINI, category: "ai", label: "Google Gemini",
    description: "Gemini for multimodal AI tasks (vision + text)",
    requiredCredential: CredentialType.GEMINI, credentialPurpose: "Google AI API key",
    operations: ["CHAT", "GENERATE_IMAGE"],
    outputVariables: [{ name: "gemini.text", description: "Generated text", example: "AI response..." }],
    maxInputs: 1, maxOutputs: 1, useCases: ["multimodal tasks", "vision + text"],
  },
  {
    type: NodeType.GROQ, category: "ai", label: "Groq",
    description: "Ultra-fast inference for Llama, Mixtral models",
    requiredCredential: CredentialType.GROQ, credentialPurpose: "Groq API key",
    operations: ["CHAT"],
    outputVariables: [{ name: "groq.text", description: "Generated text", example: "AI response..." }],
    maxInputs: 1, maxOutputs: 1, useCases: ["fast inference", "real-time AI"],
  },
  {
    type: NodeType.DEEPSEEK, category: "ai", label: "DeepSeek",
    description: "DeepSeek for code generation and reasoning",
    requiredCredential: CredentialType.DEEPSEEK, credentialPurpose: "DeepSeek API key",
    operations: ["CHAT"],
    outputVariables: [{ name: "deepseek.text", description: "Generated text", example: "AI response..." }],
    maxInputs: 1, maxOutputs: 1, useCases: ["code generation", "analysis"],
  },
];

export const LOGIC_NODES: NodeCapability[] = [
  {
    type: NodeType.IF_ELSE, category: "logic", label: "If/Else",
    description: "Branch workflow based on a condition",
    operations: ["EQUALS", "NOT_EQUALS", "CONTAINS", "GREATER_THAN", "LESS_THAN", "IS_EMPTY", "REGEX_MATCH"],
    outputVariables: [{ name: "ifElse.result", description: "Branch taken (true/false)", example: "true" }],
    maxInputs: 1, maxOutputs: 2, useCases: ["conditional routing", "data filtering"],
  },
  {
    type: NodeType.SWITCH, category: "logic", label: "Switch",
    description: "Route to one of N branches based on value matching",
    outputVariables: [{ name: "switch.branch", description: "Selected branch", example: "branch_1" }],
    maxInputs: 1, maxOutputs: -1, useCases: ["multi-way routing", "category handling"],
  },
  {
    type: NodeType.LOOP, category: "logic", label: "Loop",
    description: "Iterate over an array of items",
    outputVariables: [
      { name: "loop.item", description: "Current item", example: "{...}" },
      { name: "loop.index", description: "Current index", example: "0" },
    ],
    maxInputs: 1, maxOutputs: 1, useCases: ["batch processing", "bulk operations"],
  },
  {
    type: NodeType.FILTER, category: "logic", label: "Filter",
    description: "Filter an array based on conditions",
    outputVariables: [
      { name: "filter.items", description: "Filtered items", example: "[...]" },
      { name: "filter.count", description: "Item count", example: "5" },
    ],
    maxInputs: 1, maxOutputs: 1, useCases: ["data filtering", "array processing"],
  },
  {
    type: NodeType.SORT, category: "logic", label: "Sort",
    description: "Sort arrays by one or more keys",
    outputVariables: [{ name: "sort.items", description: "Sorted items", example: "[...]" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["ordering data", "rankings"],
  },
  {
    type: NodeType.AGGREGATE, category: "logic", label: "Aggregate",
    description: "Sum, count, average, group arrays",
    outputVariables: [{ name: "aggregate.result", description: "Aggregation result", example: "1500" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["summaries", "statistics", "grouping"],
  },
  {
    type: NodeType.MERGE, category: "logic", label: "Merge",
    description: "Merge data from multiple input branches",
    outputVariables: [{ name: "merge.data", description: "Merged output", example: "{...}" }],
    maxInputs: -1, maxOutputs: 1, useCases: ["joining branches", "data consolidation"],
  },
];

export const INTEGRATION_NODES: NodeCapability[] = [
  {
    type: NodeType.RAZORPAY, category: "integration", label: "Razorpay",
    description: "28 operations: orders, payments, refunds, subscriptions, payouts",
    requiredCredential: CredentialType.RAZORPAY, credentialPurpose: "Razorpay Key ID and Secret",
    operations: ["ORDER_CREATE", "PAYMENT_FETCH", "REFUND_CREATE", "SUBSCRIPTION_CREATE", "PAYMENT_LINK_CREATE"],
    outputVariables: [{ name: "razorpay.order", description: "Order object", example: "{ id: 'order_xxx' }" }],
    maxInputs: 1, maxOutputs: 1, isIndiaSpecific: true, useCases: ["payment processing", "refunds", "subscriptions"],
  },
  {
    type: NodeType.CASHFREE, category: "integration", label: "Cashfree",
    description: "Cashfree payments, payouts, UPI — India's fastest-growing payment gateway",
    requiredCredential: CredentialType.CASHFREE, credentialPurpose: "Cashfree App ID and Secret",
    operations: ["CREATE_ORDER", "GET_ORDER", "CREATE_REFUND", "VALIDATE_UPI_ID"],
    outputVariables: [{ name: "cashfree.order", description: "Order object", example: "{ order_id: 'xxx' }" }],
    maxInputs: 1, maxOutputs: 1, isIndiaSpecific: true, useCases: ["payment processing", "UPI payments"],
  },
  {
    type: NodeType.ZOHO_CRM, category: "integration", label: "Zoho CRM",
    description: "32 operations: leads, contacts, deals, tasks",
    requiredCredential: CredentialType.ZOHO_CRM, credentialPurpose: "Zoho CRM OAuth2 tokens",
    operations: ["CREATE_LEAD", "CREATE_CONTACT", "CREATE_DEAL", "SEARCH_LEADS", "UPDATE_LEAD"],
    outputVariables: [{ name: "zohoCrm.record", description: "Created record", example: "{ id: 'xxx' }" }],
    maxInputs: 1, maxOutputs: 1, isIndiaSpecific: true, useCases: ["CRM automation", "lead management"],
  },
  {
    type: NodeType.HUBSPOT, category: "integration", label: "HubSpot",
    description: "35 operations: contacts, companies, deals, tickets",
    requiredCredential: CredentialType.HUBSPOT, credentialPurpose: "HubSpot Private App token",
    operations: ["CREATE_CONTACT", "UPDATE_DEAL", "CREATE_TICKET", "UPSERT_CONTACT"],
    outputVariables: [{ name: "hubspot.record", description: "Created record", example: "{ id: 'xxx' }" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["CRM automation", "ticketing", "marketing"],
  },
  {
    type: NodeType.FRESHDESK, category: "integration", label: "Freshdesk",
    description: "Support ticket management, contacts, agents",
    requiredCredential: CredentialType.FRESHDESK, credentialPurpose: "Freshdesk API key + domain",
    operations: ["CREATE_TICKET", "UPDATE_TICKET", "CREATE_CONTACT", "SEND_REPLY"],
    outputVariables: [{ name: "freshdesk.ticket", description: "Ticket object", example: "{ id: 123 }" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["support automation", "ticket routing"],
  },
  {
    type: NodeType.SHIPROCKET, category: "integration", label: "Shiprocket",
    description: "23 operations: orders, tracking, returns, labels",
    requiredCredential: CredentialType.SHIPROCKET, credentialPurpose: "Shiprocket API token",
    operations: ["CREATE_ORDER", "TRACK_SHIPMENT", "GENERATE_LABEL", "GENERATE_AWB"],
    outputVariables: [{ name: "shiprocket.order", description: "Shipping order", example: "{ id: 'xxx' }" }],
    maxInputs: 1, maxOutputs: 1, isIndiaSpecific: true, useCases: ["shipping automation", "order fulfillment"],
  },
  {
    type: NodeType.GITHUB, category: "integration", label: "GitHub",
    description: "Repository, issues, PRs, workflows, releases — 100+ operations",
    requiredCredential: CredentialType.GITHUB, credentialPurpose: "GitHub Personal Access Token",
    operations: ["ISSUE_CREATE", "PULL_REQUEST_CREATE", "REPOSITORY_LIST", "WORKFLOW_DISPATCH", "FILE_CREATE"],
    outputVariables: [{ name: "github.result", description: "Operation result", example: "{...}" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["CI/CD", "issue tracking", "code automation"],
  },
  {
    type: NodeType.POSTGRES, category: "integration", label: "PostgreSQL",
    description: "Query, insert, update data in a PostgreSQL database",
    requiredCredential: CredentialType.POSTGRES, credentialPurpose: "PostgreSQL connection string",
    operations: ["EXECUTE_QUERY", "INSERT_ROW", "UPDATE_ROWS", "SELECT_ROWS"],
    outputVariables: [{ name: "postgres.rows", description: "Query result rows", example: "[{...}]" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["database operations", "data sync"],
  },
];

export const PRODUCTIVITY_NODES: NodeCapability[] = [
  {
    type: NodeType.GOOGLE_SHEETS, category: "productivity", label: "Google Sheets",
    description: "Read, append, update rows in Google Sheets",
    requiredCredential: CredentialType.GOOGLE_SHEETS, credentialPurpose: "Google OAuth2 for Sheets access",
    operations: ["APPEND_ROW", "READ_ROWS", "UPDATE_ROW", "SEARCH_ROWS", "DELETE_ROW"],
    outputVariables: [{ name: "googleSheets.rows", description: "Row data", example: "[{...}]" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["data storage", "reporting"],
  },
  {
    type: NodeType.GOOGLE_DRIVE, category: "productivity", label: "Google Drive",
    description: "Upload, download, list files in Google Drive",
    requiredCredential: CredentialType.GOOGLE_DRIVE, credentialPurpose: "Google OAuth2 for Drive access",
    operations: ["UPLOAD_FILE", "DOWNLOAD_FILE", "LIST_FILES", "CREATE_FOLDER"],
    outputVariables: [{ name: "googleDrive.file", description: "File metadata", example: "{ id: 'xxx' }" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["file management", "document storage"],
  },
  {
    type: NodeType.NOTION, category: "productivity", label: "Notion",
    description: "Interact with Notion databases, pages, and blocks",
    requiredCredential: CredentialType.NOTION, credentialPurpose: "Notion integration token",
    operations: ["QUERY_DATABASE", "CREATE_DATABASE_PAGE", "UPDATE_DATABASE_PAGE", "SEARCH"],
    outputVariables: [{ name: "notion.page", description: "Page object", example: "{ id: 'xxx' }" }],
    maxInputs: 1, maxOutputs: 1, useCases: ["documentation", "project management", "knowledge base"],
  },
];

export const ALL_NODE_CAPABILITIES: NodeCapability[] = [
  ...TRIGGER_NODES,
  ...EXECUTION_NODES,
  ...COMMUNICATION_NODES,
  ...AI_NODES,
  ...LOGIC_NODES,
  ...INTEGRATION_NODES,
  ...PRODUCTIVITY_NODES,
];

export function getNodeCapability(type: NodeType): NodeCapability | undefined {
  return ALL_NODE_CAPABILITIES.find((n) => n.type === type);
}

export function getNodesRequiringCredential(credentialType: CredentialType): NodeCapability[] {
  return ALL_NODE_CAPABILITIES.filter((n) => n.requiredCredential === credentialType);
}

export function getTriggerNodes(): NodeCapability[] {
  return ALL_NODE_CAPABILITIES.filter((n) => n.category === "trigger");
}

/** Compact registry string injected into the AI system prompt */
export function getRegistryForPrompt(): string {
  return ALL_NODE_CAPABILITIES.map((node) => {
    let nodeText = `### ${node.label} (${node.type})\n${node.description}\n`;
    if (node.requiredCredential) {
      nodeText += `- Requires Credential: ${node.requiredCredential}\n`;
    }
    if (node.operations) {
      nodeText += `- Operations: ${node.operations.join(", ")}\n`;
    }
    if (node.exampleData) {
      nodeText += `- Example Data config: ${node.exampleData}\n`;
    }
    nodeText += `- Output Variables: ${node.outputVariables.map(v => v.name).join(", ")}\n`;
    return nodeText;
  }).join("\n");
}
