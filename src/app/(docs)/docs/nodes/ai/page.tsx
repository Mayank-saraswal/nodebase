import type { Metadata } from "next";
import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { Breadcrumb, PrevNextLinks } from "@/components/docs/docs-shell";

export const metadata: Metadata = { title: "AI Nodes" };

export default function AiNodesPage() {
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Nodes", href: "/docs/nodes" },
          { label: "AI Nodes" },
        ]}
      />

      <h1 className="text-4xl font-bold tracking-tight">AI Integration &amp; Nodes</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Build intelligent, automated workflows with state-of-the-art Large Language Models.
        Nodebase natively supports 7 leading AI providers with a unified interface to perform text generation, structure extraction, image vision, function calling, audio transcription, vector embeddings, image generation, and multi-label classification.
      </p>

      {/* Table of Contents */}
      <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
        <h4 className="font-semibold text-foreground">Table of Contents</h4>
        <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-orange hover:text-orange-dark">
          <li><a href="#providers" className="underline">1. Supported Providers &amp; Default Models</a></li>
          <li><a href="#common-config" className="underline">2. Common Parameters &amp; Settings</a></li>
          <li><a href="#operations" className="underline">3. Operations Guide (All 9 Types)</a></li>
          <li><a href="#advanced-features" className="underline">4. Advanced &amp; Provider-Specific Features</a></li>
          <li><a href="#credentials" className="underline">5. Setting Up Credentials</a></li>
          <li><a href="#examples" className="underline">6. Complete Workflow Blueprints</a></li>
          <li><a href="#troubleshooting" className="underline">7. Troubleshooting &amp; Rate Limits</a></li>
        </ul>
      </div>

      {/* Provider Comparison */}
      <h2 id="providers" className="mt-12 text-2xl font-bold">
        Supported Providers &amp; Default Models
      </h2>
      <p className="mt-2 text-muted-foreground">
        Each provider has a curated set of capabilities and is pre-configured with industry-standard default models. You can also customize the model name manually in the configuration panel.
      </p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left font-semibold">Provider</th>
              <th className="px-4 py-2.5 text-left font-semibold">Default Model</th>
              <th className="px-4 py-2.5 text-left font-semibold">Key Advantage</th>
              <th className="px-4 py-2.5 text-left font-semibold">Supported Operations</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "OpenAI",
                "gpt-4o",
                "Industry standard for structured outputs, tool use, and DALL-E 3 image generation.",
                "CHAT, CHAT_WITH_HISTORY, STRUCTURED_OUTPUT, TOOL_USE, VISION, EMBED, TRANSCRIBE, GENERATE_IMAGE, CLASSIFY",
              ],
              [
                "Anthropic",
                "claude-sonnet-4-5",
                "Unmatched reasoning depth, coding capabilities, and instruction-following precision.",
                "CHAT, CHAT_WITH_HISTORY, STRUCTURED_OUTPUT, TOOL_USE, VISION, CLASSIFY",
              ],
              [
                "Gemini",
                "gemini-2.5-flash",
                "Massive context window, cost-efficient, fast multimodal vision, and Imagen 3 generation.",
                "CHAT, CHAT_WITH_HISTORY, STRUCTURED_OUTPUT, TOOL_USE, VISION, EMBED, GENERATE_IMAGE, CLASSIFY",
              ],
              [
                "Groq",
                "llama-3.3-70b-versatile",
                "Ultra-low latency inference, perfect for real-time chatbot replies and swift voice transcribing.",
                "CHAT, CHAT_WITH_HISTORY, STRUCTURED_OUTPUT, TOOL_USE, TRANSCRIBE, CLASSIFY",
              ],
              [
                "xAI",
                "grok-3-beta",
                "Real-time information access and highly modern prompt parsing capabilities.",
                "CHAT, CHAT_WITH_HISTORY, STRUCTURED_OUTPUT, TOOL_USE, VISION, CLASSIFY",
              ],
              [
                "DeepSeek",
                "deepseek-chat",
                "Extremely cost-efficient reasoning models. Includes reasoning output extraction.",
                "CHAT, CHAT_WITH_HISTORY, STRUCTURED_OUTPUT, CLASSIFY",
              ],
              [
                "Perplexity",
                "sonar-pro",
                "Integrated real-world web search. Returns responses complete with source citation URLs.",
                "CHAT, CHAT_WITH_HISTORY, CLASSIFY",
              ],
            ].map(([node, model, bestFor, ops], i) => (
              <tr key={node} className={i % 2 ? "bg-muted/30" : ""}>
                <td className="px-4 py-2.5 font-medium">{node}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{model}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{bestFor}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {ops.split(", ").map((op) => (
                      <span key={op} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground/80">
                        {op}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Common Parameters */}
      <h2 id="common-config" className="mt-12 text-2xl font-bold">
        Common Parameters &amp; Settings
      </h2>
      <p className="mt-2 text-muted-foreground">
        These parameters govern how models run across all operations and influence determinism, safety, and output limits.
      </p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left font-semibold">Parameter</th>
              <th className="px-4 py-2.5 text-left font-semibold">Type</th>
              <th className="px-4 py-2.5 text-left font-semibold">Description</th>
              <th className="px-4 py-2.5 text-left font-semibold">Supports Templates</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Variable Name", "String (Required)", "The key where the results are stored in the workflow context. E.g. setting 'myAI' allows referencing output as {{myAI.text}}.", "No"],
              ["Credential", "Select (Required)", "The API Key credential created in Settings → Credentials.", "No"],
              ["Operation", "Dropdown (Required)", "The AI task to execute (e.g. Chat, Vision, structured JSON output).", "No"],
              ["Model", "Select / Input (Required)", "The model ID to run. Can select from the defaults or type a custom model path.", "No"],
              ["System Prompt", "Textarea (Optional)", "System-level instructions defining the AI's role, rules, and persona.", "Yes"],
              ["User Prompt", "Textarea (Required for most)", "The main input query. Supports dynamic workflow templates.", "Yes"],
              ["Temperature", "Slider (0.0 to 2.0)", "Controls randomness: 0.0 is deterministic and factual; 2.0 is highly creative.", "No"],
              ["Max Tokens", "Number (1 to 100,000+)", "The maximum length of the generated response.", "No"],
              ["Top P", "Slider (0.0 to 1.0)", "Nucleus sampling threshold. Alternative control for creativity.", "No"],
              ["Frequency Penalty", "Slider (-2.0 to 2.0)", "Discourages the model from repeating words. (Supported by OpenAI, Groq, xAI, DeepSeek, Perplexity)", "No"],
              ["Presence Penalty", "Slider (-2.0 to 2.0)", "Encourages the model to introduce new topics. (Supported by OpenAI, Groq, xAI, DeepSeek, Perplexity)", "No"],
              ["Continue on Fail", "Switch", "If turned ON, the workflow continues running even if the AI provider request fails.", "No"],
            ].map(([param, type, desc, vars], i) => (
              <tr key={param} className={i % 2 ? "bg-muted/30" : ""}>
                <td className="px-4 py-2.5 font-medium">{param}</td>
                <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{type}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{desc}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{vars}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Operations Guide */}
      <h2 id="operations" className="mt-16 text-3xl font-bold">
        Operations Guide
      </h2>
      <p className="mt-3 text-muted-foreground">
        Nodebase simplifies working with advanced LLM modalities. Below is the detailed configuration, output layout, and a real-life blueprint for each of the 9 operations.
      </p>

      {/* 1. CHAT */}
      <div className="mt-8 border-l-4 border-orange pl-4">
        <h3 id="op-chat" className="text-xl font-bold">1. Chat (Factual / Creative Text Generation)</h3>
        <p className="mt-2 text-foreground/80">
          Standard text generation. Use it to write copy, answer queries, summarize text, translate languages, or draft documents.
        </p>
        <h4 className="mt-3 font-semibold text-sm">Operation Parameters</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
          <li><strong>System Prompt:</strong> Custom behavior instructions.</li>
          <li><strong>User Prompt:</strong> The primary instruction or question.</li>
        </ul>
        <h4 className="mt-3 font-semibold text-sm">Output Variable Format (assuming variable name is <code>ai</code>)</h4>
        <CodeBlock
          language="json"
          code={`{
  "ai": {
    "text": "Hello! I can help you summarize files...",
    "aiResponse": "Hello! I can help you summarize files...",
    "model": "gpt-4o",
    "usage": {
      "promptTokens": 28,
      "completionTokens": 11,
      "totalTokens": 39
    }
  }
}`}
        />
        <h4 className="mt-3 font-semibold text-sm">Real-life Blueprint</h4>
        <p className="text-sm text-muted-foreground mb-2">Automate support ticketing categorization:</p>
        <CodeBlock
          language="text"
          code={`Trigger: Webhook (Customer Support Form Submission)
→ OpenAI (Operation: CHAT)
  System Prompt: "You are a customer support triage assistant. Read the ticket and output exactly one word: CRITICAL, MEDIUM, or LOW."
  User Prompt: "Ticket body: {{trigger.body.message}}"
→ Gmail (Send Email)
  Subject: "[{{ai.text}} Priority] New Customer Ticket"
  Body: "{{trigger.body.message}}"`}
        />
      </div>

      {/* 2. CHAT WITH HISTORY */}
      <div className="mt-12 border-l-4 border-orange pl-4">
        <h3 id="op-history" className="text-xl font-bold">2. Chat with History (Conversational / Stateful Chatbots)</h3>
        <p className="mt-2 text-foreground/80">
          Stores conversation context directly in the workflow's variables. It dynamically aggregates previous user messages and assistant responses.
        </p>
        <h4 className="mt-3 font-semibold text-sm">Operation Parameters</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
          <li><strong>History Variable Path:</strong> Dot-path to history array (usually <code>ai.history</code>).</li>
          <li><strong>Max History Turns:</strong> Maximum conversation turns (e.g. 10) to prevent token overflow.</li>
        </ul>
        <h4 className="mt-3 font-semibold text-sm">Output Variable Format</h4>
        <CodeBlock
          language="json"
          code={`{
  "ai": {
    "text": "Yes, I can schedule that meeting.",
    "aiResponse": "Yes, I can schedule that meeting.",
    "history": [
      { "role": "user", "content": "Hi there!" },
      { "role": "assistant", "content": "Hello! How can I assist you?" },
      { "role": "user", "content": "Can we schedule a meeting?" },
      { "role": "assistant", "content": "Yes, I can schedule that meeting." }
    ]
  }
}`}
        />
        <h4 className="mt-3 font-semibold text-sm">Real-life Blueprint</h4>
        <p className="text-sm text-muted-foreground mb-2">Build a multi-turn WhatsApp chatbot:</p>
        <CodeBlock
          language="text"
          code={`Trigger: WhatsApp Message Received
→ Groq (Operation: CHAT_WITH_HISTORY)
  History Path: "ai.history"
  Max Turns: 8
  System Prompt: "You are a friendly personal scheduling assistant."
  User Prompt: "{{whatsappTrigger.body}}"
→ WhatsApp (Send Message)
  Message: "{{ai.text}}"`}
        />
      </div>

      {/* 3. STRUCTURED OUTPUT */}
      <div className="mt-12 border-l-4 border-orange pl-4">
        <h3 id="op-structured" className="text-xl font-bold">3. Structured Output (Reliable JSON Extraction)</h3>
        <p className="mt-2 text-foreground/80">
          Enforces the model to return syntactically valid JSON. Highly useful for extracting metadata, tables, or fields from emails and documents without manual parsing.
        </p>
        <h4 className="mt-3 font-semibold text-sm">Operation Parameters</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
          <li><strong>Response Format:</strong> Set to <code>json_object</code> (returns arbitrary JSON) or <code>json_schema</code> (strict validation).</li>
          <li><strong>JSON Schema:</strong> Required for <code>json_schema</code>. Use standard JSON Schema format.</li>
        </ul>
        <h4 className="mt-3 font-semibold text-sm">Output Variable Format</h4>
        <CodeBlock
          language="json"
          code={`{
  "ai": {
    "text": "{\\"invoiceNumber\\": \\"INV-102\\", \\"totalAmount\\": 1250}",
    "json": {
      "invoiceNumber": "INV-102",
      "totalAmount": 1250
    }
  }
}`}
        />
        <h4 className="mt-3 font-semibold text-sm">Real-life Blueprint</h4>
        <p className="text-sm text-muted-foreground mb-2">Extract invoice fields from email attachments:</p>
        <CodeBlock
          language="text"
          code={`Trigger: Gmail Attachment Received
→ OpenAI (Operation: STRUCTURED_OUTPUT)
  Format: json_schema
  JSON Schema:
  {
    "type": "object",
    "properties": {
      "vendor": { "type": "string" },
      "total": { "type": "number" },
      "dueDate": { "type": "string" }
    },
    "required": ["vendor", "total"]
  }
  User Prompt: "Extract invoice details from this text: {{email.attachmentText}}"
→ Postgres (Insert Row)
  Table: invoices
  Columns: vendor = {{ai.json.vendor}}, amount = {{ai.json.total}}`}
        />
      </div>

      {/* 4. TOOL USE */}
      <div className="mt-12 border-l-4 border-orange pl-4">
        <h3 id="op-tools" className="text-xl font-bold">4. Tool / Function Calling (Autonomous Action Routing)</h3>
        <p className="mt-2 text-foreground/80">
          Instructs the AI to choose one or more functions to execute based on the user's intent. The model outputs arguments instead of conversational text.
        </p>
        <h4 className="mt-3 font-semibold text-sm">Operation Parameters</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
          <li><strong>Tools (JSON Array):</strong> Array of tool definitions (e.g. name, description, parameters).</li>
          <li><strong>Tool Choice:</strong> Set to <code>auto</code>, <code>required</code>, or <code>none</code>.</li>
        </ul>
        <h4 className="mt-3 font-semibold text-sm">Output Variable Format</h4>
        <CodeBlock
          language="json"
          code={`{
  "ai": {
    "toolCalls": [
      {
        "id": "call_abc123",
        "name": "send_slack_alert",
        "arguments": {
          "channel": "#alerts",
          "message": "Server CPU is high!"
        }
      }
    ]
  }
}`}
        />
        <h4 className="mt-3 font-semibold text-sm">Real-life Blueprint</h4>
        <p className="text-sm text-muted-foreground mb-2">Dynamically routes user commands to Slack alerts or Database updates:</p>
        <CodeBlock
          language="text"
          code={`Trigger: Slack Command "/action [command]"
→ Anthropic (Operation: TOOL_USE)
  Tools:
  [
    {
      "name": "create_event",
      "description": "Call this to create a calendar event.",
      "input_schema": {
        "type": "object",
        "properties": { "title": { "type": "string" } }
      }
    }
  ]
  User Prompt: "{{slack.commandText}}"
→ Switch (Condition on chosen tool)
  Case 1: If {{ai.toolCalls.0.name}} equals "create_event"
    → Google Calendar (Add Event: title = {{ai.toolCalls.0.arguments.title}})`}
        />
      </div>

      {/* 5. VISION */}
      <div className="mt-12 border-l-4 border-orange pl-4">
        <h3 id="op-vision" className="text-xl font-bold">5. Vision (Multimodal Image Analysis)</h3>
        <p className="mt-2 text-foreground/80">
          Enables processing and answering questions about images. Supports remote image links or Base64 data URIs.
        </p>
        <h4 className="mt-3 font-semibold text-sm">Operation Parameters</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
          <li><strong>Image URL:</strong> A single URL, or a comma-separated list of image URLs.</li>
          <li><strong>Image Detail:</strong> <code>auto</code>, <code>low</code>, or <code>high</code>.</li>
        </ul>
        <h4 className="mt-3 font-semibold text-sm">Output Variable Format</h4>
        <CodeBlock
          language="json"
          code={`{
  "ai": {
    "text": "The image shows a chart indicating 24% growth in Q3 sales.",
    "aiResponse": "The image shows a chart indicating 24% growth in Q3 sales."
  }
}`}
        />
        <h4 className="mt-3 font-semibold text-sm">Real-life Blueprint</h4>
        <p className="text-sm text-muted-foreground mb-2">Automatically inspect and verify customer receipts:</p>
        <CodeBlock
          language="text"
          code={`Trigger: Webhook (Form file upload)
→ Gemini (Operation: VISION)
  Image URL: "{{webhook.body.receiptUrl}}"
  User Prompt: "What is the total amount and list of items on this receipt?"
→ Slack (Send Message)
  Message: "Verified Receipt: {{ai.text}}"`}
        />
      </div>

      {/* 6. EMBED */}
      <div className="mt-12 border-l-4 border-orange pl-4">
        <h3 id="op-embed" className="text-xl font-bold">6. Generate Embeddings (Vector Databases &amp; Search)</h3>
        <p className="mt-2 text-foreground/80">
          Translates text strings into floating-point numerical arrays (vectors). Indispensable for semantic search and retrieval-augmented generation (RAG) architectures.
        </p>
        <h4 className="mt-3 font-semibold text-sm">Operation Parameters</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
          <li><strong>Text to Embed:</strong> The string content (falls back to User Prompt).</li>
        </ul>
        <h4 className="mt-3 font-semibold text-sm">Output Variable Format</h4>
        <CodeBlock
          language="json"
          code={`{
  "ai": {
    "embedding": [0.01254, -0.00512, 0.08941, -0.03411, 0.00122]
  }
}`}
        />
        <h4 className="mt-3 font-semibold text-sm">Real-life Blueprint</h4>
        <p className="text-sm text-muted-foreground mb-2">Build a search index for internal document portals:</p>
        <CodeBlock
          language="text"
          code={`Trigger: Notion Page Created
→ OpenAI (Operation: EMBED)
  Text to Embed: "{{notion.pageContent}}"
→ Postgres (Insert Vector Row)
  Table: page_vectors
  Columns: notion_id = {{notion.id}}, embedding_vector = {{ai.embedding}}`}
        />
      </div>

      {/* 7. TRANSCRIBE */}
      <div className="mt-12 border-l-4 border-orange pl-4">
        <h3 id="op-transcribe" className="text-xl font-bold">7. Audio Transcription (Speech-to-Text)</h3>
        <p className="mt-2 text-foreground/80">
          Transcribes audio files into written text. Supports Whisper models on OpenAI and Groq.
        </p>
        <h4 className="mt-3 font-semibold text-sm">Operation Parameters</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
          <li><strong>Audio URL:</strong> Public URL of the audio file (e.g. mp3, wav, m4a).</li>
          <li><strong>Language:</strong> Optional ISO language code (e.g. <code>en</code>, <code>es</code>).</li>
          <li><strong>Output Format:</strong> <code>text</code>, <code>json</code>, <code>srt</code>, or <code>vtt</code>.</li>
        </ul>
        <h4 className="mt-3 font-semibold text-sm">Output Variable Format</h4>
        <CodeBlock
          language="json"
          code={`{
  "ai": {
    "transcript": "Hello, thank you for contacting our customer service department. My name is..."
  }
}`}
        />
        <h4 className="mt-3 font-semibold text-sm">Real-life Blueprint</h4>
        <p className="text-sm text-muted-foreground mb-2">Automatically transcribe and log customer voicemails:</p>
        <CodeBlock
          language="text"
          code={`Trigger: Twilio Voicemail Received
→ Groq (Operation: TRANSCRIBE)
  Audio URL: "{{twilio.recordingUrl}}"
  Model: whisper-large-v3
→ Hubspot (Create Task)
  Task Title: "New Voicemail from {{twilio.callerNumber}}"
  Notes: "Transcription: {{ai.transcript}}"`}
        />
      </div>

      {/* 8. GENERATE_IMAGE */}
      <div className="mt-12 border-l-4 border-orange pl-4">
        <h3 id="op-image" className="text-xl font-bold">8. Generate Image (Creative Asset Creation)</h3>
        <p className="mt-2 text-foreground/80">
          Synthesizes fresh images from textual descriptions. Connects to DALL-E 3 (OpenAI) and Imagen 3 (Gemini).
        </p>
        <h4 className="mt-3 font-semibold text-sm">Operation Parameters</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
          <li><strong>Image Prompt:</strong> Text description of the image.</li>
          <li><strong>Size:</strong> Resolution (e.g. <code>1024x1024</code>, <code>1792x1024</code>).</li>
          <li><strong>Count:</strong> Quantity of images to output.</li>
          <li><strong>Quality / Style:</strong> (OpenAI only) Select standard/hd and vivid/natural.</li>
        </ul>
        <h4 className="mt-3 font-semibold text-sm">Output Variable Format</h4>
        <CodeBlock
          language="json"
          code={`{
  "ai": {
    "imageUrls": ["https://nodebase-spaces.nyc3.cdn.digitaloceanspaces.com/generated-image-0.png"],
    "imageUrl": "https://nodebase-spaces.nyc3.cdn.digitaloceanspaces.com/generated-image-0.png",
    "originalImageUrls": ["https://dalleprod.blob.core.windows.net/..."]
  }
}`}
        />
        <Callout type="info">
          <strong>Tip:</strong> Nodebase automatically downloads generated images and saves them to your private Cloud Storage bucket immediately, replacing the temporary provider URLs. This ensures your links never expire!
        </Callout>
        <h4 className="mt-3 font-semibold text-sm">Real-life Blueprint</h4>
        <p className="text-sm text-muted-foreground mb-2">Automate marketing copy to social graphic creation:</p>
        <CodeBlock
          language="text"
          code={`Trigger: Notion (New Campaign Idea)
→ OpenAI (Operation: GENERATE_IMAGE)
  Image Prompt: "A high-end vector icon representing {{notion.campaignTitle}}, flat illustration"
  Size: 1024x1024
→ Slack (Send Campaign Summary)
  Message: "Visual idea generated for {{notion.campaignTitle}}: {{ai.imageUrl}}"`}
        />
      </div>

      {/* 9. CLASSIFY */}
      <div className="mt-12 border-l-4 border-orange pl-4">
        <h3 id="op-classify" className="text-xl font-bold">9. Text Classification (Fast Multi-Label Sorting)</h3>
        <p className="mt-2 text-foreground/80">
          Performs zero-shot or few-shot classification, returning a precise label and confidence score. Superb for sentiment analysis, sorting leads, or filtering spam.
        </p>
        <h4 className="mt-3 font-semibold text-sm">Operation Parameters</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
          <li><strong>Labels:</strong> Comma-separated categories (e.g. <code>spam, billing, query</code>).</li>
          <li><strong>Few-Shot Examples (JSON):</strong> Optional array of text-label pairs.</li>
        </ul>
        <h4 className="mt-3 font-semibold text-sm">Output Variable Format</h4>
        <CodeBlock
          language="json"
          code={`{
  "ai": {
    "label": "billing",
    "confidence": 0.9,
    "text": "billing"
  }
}`}
        />
        <h4 className="mt-3 font-semibold text-sm">Real-life Blueprint</h4>
        <p className="text-sm text-muted-foreground mb-2">Auto-route inbound sales emails:</p>
        <CodeBlock
          language="text"
          code={`Trigger: Inbound Email Received
→ Anthropic (Operation: CLASSIFY)
  Labels: "sales, support, spam"
  Examples: [{"text":"I want to buy 50 seats","label":"sales"},{"text":"Reset password please","label":"support"}]
  User Prompt: "{{email.body}}"
→ Switch (Condition on classified label)
  Case 1: If {{ai.label}} equals "sales"
    → Slack (Send to #leads-channel)
  Case 2: If {{ai.label}} equals "support"
    → Freshdesk (Create Support Ticket)`}
        />
      </div>

      {/* Advanced Features */}
      <h2 id="advanced-features" className="mt-16 text-2xl font-bold">
        Advanced &amp; Provider-Specific Features
      </h2>
      <p className="mt-2 text-muted-foreground">
        Nodebase exposes provider-specific capabilities natively without requiring separate code nodes.
      </p>

      <div className="mt-4 space-y-4">
        <div className="rounded-lg border p-4 bg-muted/10">
          <h4 className="font-semibold text-foreground text-sm">🌐 Web Search Citations (Perplexity)</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            When running <strong>Perplexity</strong> models like <code>sonar-pro</code>, the node automatically performs real-time search and appends citation sources to the output variable structure.
          </p>
          <CodeBlock
            language="json"
            code={`{
  "perplexity": {
    "text": "Google released Gemini 2.5 on June 3rd [1].",
    "citations": [
      "https://techcrunch.com/2026/06/03/google-gemini-2-5"
    ]
  }
}`}
          />
        </div>

        <div className="rounded-lg border p-4 bg-muted/10">
          <h4 className="font-semibold text-foreground text-sm">🧠 DeepSeek Reasoning Extraction</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            When using DeepSeek's <code>deepseek-reasoner</code> (DeepSeek-R1) models, the cognitive "thought chain" is separated and saved into the <code>reasoning</code> property so you can inspect its thinking process in logs or pass it down the pipeline.
          </p>
          <CodeBlock
            language="json"
            code={`{
  "deepseek": {
    "text": "The final answer is X.",
    "reasoning": "First, let's analyze the formula... then integrate... hence we get X."
  }
}`}
          />
        </div>

        <div className="rounded-lg border p-4 bg-muted/10">
          <h4 className="font-semibold text-foreground text-sm">💾 Immediate Cloud Image Storage</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Image URLs returned by DALL-E and Imagen typically expire within 1 hour. Nodebase intercepts the base64 or temporary output, uploads it to your DigitalOcean Spaces bucket, and updates <code>imageUrl</code> to a permanent public link.
          </p>
        </div>
      </div>

      {/* Credentials Setup */}
      <h2 id="credentials" className="mt-12 text-2xl font-bold">
        Setting Up Credentials
      </h2>
      <p className="mt-2 text-muted-foreground">
        To use any AI provider, you must create a credential configuration storing your private API keys.
      </p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left font-semibold">Provider</th>
              <th className="px-4 py-2.5 text-left font-semibold">Where to get API Key</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["OpenAI", "platform.openai.com → API keys"],
              ["Anthropic", "console.anthropic.com → API Keys"],
              ["Gemini", "aistudio.google.com → Get API Key"],
              ["Groq", "console.groq.com → API Keys"],
              ["DeepSeek", "platform.deepseek.com → API Keys"],
              ["Perplexity", "www.perplexity.ai → Settings → API"],
              ["xAI", "console.x.ai → API Keys"],
            ].map(([provider, location], i) => (
              <tr key={provider} className={i % 2 ? "bg-muted/30" : ""}>
                <td className="px-4 py-2.5 font-medium">{provider}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ol className="mt-4 list-inside list-decimal space-y-1 text-foreground/80 text-sm">
        <li>Go to <strong>Settings → Credentials</strong> in the Nodebase Dashboard.</li>
        <li>Click <strong>Add Credential</strong>.</li>
        <li>Select the respective Provider (e.g. OpenAI).</li>
        <li>Name the credential (e.g., <em>Production OpenAI Key</em>) and paste your API Key.</li>
        <li>Click <strong>Save</strong>. You can now select this key inside the AI node configuration dialog.</li>
      </ol>

      {/* Complex Workflow Examples */}
      <h2 id="examples" className="mt-16 text-2xl font-bold">
        Complete Workflow Blueprints
      </h2>

      <h3 id="blueprint-audio-transcribe" className="mt-8 text-xl font-semibold">
        AI-Powered Voice Assistant (Transcribe → Answer → Speak)
      </h3>
      <p className="mt-2 text-foreground/80 text-sm">
        <strong>Objective:</strong> Listen to customer voice notes, transcribe them with Groq, compose an intelligent response using Claude, and log it to Slack.
      </p>
      <CodeBlock
        language="text"
        title="Voice Assistant Workflow"
        code={`Telegram Trigger (Voice Note attachment URL)
→ Groq (Operation: TRANSCRIBE)
    Model:        whisper-large-v3
    Audio URL:    {{telegram.voiceNoteUrl}}
→ Anthropic (Operation: CHAT)
    Model:        claude-3-5-sonnet-latest
    System:       "You are an assistant. Answer questions concisely in 1 sentence."
    Prompt:       "Customer asked: {{ai.transcript}}"
→ Slack (Send Message)
    Channel:      #customer-voice-logs
    Text:         "New Voicemail:\\n*Transcription:* {{ai.transcript}}\\n*AI Response:* {{ai.text}}"`}
      />

      <h3 id="blueprint-researcher" className="mt-12 text-xl font-semibold">
        Automatic Competitor Research Alert
      </h3>
      <p className="mt-2 text-foreground/80 text-sm">
        <strong>Objective:</strong> Trigger research via webhooks, use Perplexity to search the live web for competitor data, format the output in structured JSON using OpenAI, and write it to Google Sheets.
      </p>
      <CodeBlock
        language="text"
        title="Research Alert Workflow"
        code={`Webhook Trigger (POST /research, body: { competitorName })
→ Perplexity (Operation: CHAT)
    Model:        sonar-pro
    Prompt:       "Search the web for the latest product releases from {{body.competitorName}} in the last 30 days."
→ OpenAI (Operation: STRUCTURED_OUTPUT)
    Model:        gpt-4o-mini
    Format:       json_schema
    JSON Schema:
    {
      "type": "object",
      "properties": {
        "features": { "type": "array", "items": { "type": "string" } },
        "sentiment": { "type": "string" }
      },
      "required": ["features", "sentiment"]
    }
    Prompt:       "Convert this research report into structural keys: {{ai.text}}"
→ Google Sheets (Add Row)
    Spreadsheet:  Competitor Analysis
    Data:         Name = {{body.competitorName}}, Features = {{ai.json.features}}, Sentiment = {{ai.json.sentiment}}`}
      />

      {/* Troubleshooting */}
      <h2 id="troubleshooting" className="mt-16 text-2xl font-bold">
        Troubleshooting &amp; Rate Limits
      </h2>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left font-semibold">Error Code / Issue</th>
              <th className="px-4 py-2.5 text-left font-semibold">Reason</th>
              <th className="px-4 py-2.5 text-left font-semibold">Solution</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "401 Unauthorized",
                "Your credential contains an incorrect or expired API Key.",
                "Verify your token on the provider's billing console. Re-add the credential inside Nodebase Settings.",
              ],
              [
                "429 Rate Limit",
                "You have hit the request-per-minute (RPM) or token-per-minute (TPM) limits set by the provider.",
                "Nodebase automatically retries 429 errors in the background with exponential backoff. To avoid limits, upgrade your tier at the provider or add a Wait node in the workflow.",
              ],
              [
                "Invalid JSON schema",
                "The JSON string in the structured output schema field contains a syntax error.",
                "Validate the schema in a JSON linter. Ensure all parameters, properties, and required fields conform to RFC 8259.",
              ],
              [
                "Image URL expires",
                "Using the provider's direct URL (e.g. OpenAI's temporary URL) beyond its 1-hour expiration.",
                "Use the 'imageUrls' output variable instead. Nodebase persists these automatically to secure cloud storage so they remain valid forever.",
              ],
            ].map(([issue, cause, solution], i) => (
              <tr key={issue} className={i % 2 ? "bg-muted/30" : ""}>
                <td className="px-4 py-2.5 font-medium">{issue}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{cause}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{solution}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PrevNextLinks />
    </>
  );
}
