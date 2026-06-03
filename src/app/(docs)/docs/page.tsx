import {
  Bot,
  Code,
  FileText,
  Globe,
  Mail,
  MessageCircle,
  Repeat,
  SlidersHorizontal,
  Table,
  Zap,
  Shield,
  Layers,
  Cpu,
  RefreshCw,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";

export const metadata: Metadata = { title: "Introduction" };

const quickCards = [
  {
    title: "Getting Started",
    desc: "Set up your account and build your first workflow in 5 minutes.",
    href: "/docs/getting-started",
    icon: FileText,
  },
  {
    title: "All Nodes (29)",
    desc: "Explore every node — triggers, AI, messaging, payments, and more.",
    href: "/docs/nodes",
    icon: Zap,
  },
];

const popularNodes = [
  { title: "Razorpay", href: "/docs/nodes/razorpay", logo: "/logos/razorpay.svg" },
  { title: "WhatsApp", href: "/docs/nodes/whatsapp", icon: MessageCircle },
  { title: "Notion", href: "/docs/nodes/notion", icon: FileText },
  { title: "HTTP Request", href: "/docs/nodes/http-request", icon: Globe },
  { title: "Gmail", href: "/docs/nodes/gmail", icon: Mail },
  { title: "Google Sheets", href: "/docs/nodes/google-sheets", icon: Table },
  { title: "Code", href: "/docs/nodes/code", icon: Code },
  { title: "Loop", href: "/docs/nodes/loop", icon: Repeat },
];

const categories = [
  {
    title: "Triggers",
    desc: "5 trigger types — manual, webhook, schedule, Google Forms, Stripe",
    href: "/docs/nodes#triggers",
    color: "bg-green-100 text-green-700",
  },
  {
    title: "AI Nodes",
    desc: "7 providers — Gemini, OpenAI, Anthropic, xAI, DeepSeek, Perplexity, Groq",
    href: "/docs/nodes#ai-nodes",
    color: "bg-purple-100 text-purple-700",
  },
  {
    title: "Messaging",
    desc: "5 channels — WhatsApp, Discord, Slack, Telegram, X",
    href: "/docs/nodes#messaging",
    color: "bg-blue-100 text-blue-700",
  },
  {
    title: "Google Workspace",
    desc: "Gmail, Google Sheets, Google Drive",
    href: "/docs/nodes#google-workspace",
    color: "bg-red-100 text-red-700",
  },
  {
    title: "Payments & SaaS",
    desc: "Razorpay (28 ops), Notion (11 ops), Workday",
    href: "/docs/nodes#payments-saas",
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    title: "Utility & Logic",
    desc: "HTTP Request, If/Else, Set Variable, Code, Loop",
    href: "/docs/nodes#utility-logic",
    color: "bg-gray-100 text-gray-700",
  },
];

export default function DocsHomePage() {
  return (
    <>
      <h1 className="text-4xl font-bold tracking-tight">
        Nodebase Documentation
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Learn how to automate workflows, connect applications, and scale business pipelines
        with Nodebase — the industry-grade visual workflow automation platform designed for modern engineering teams.
      </p>

      {/* Quick-start cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {quickCards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-orange/40 hover:bg-orange-subtle"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange/10 text-orange">
              <c.icon className="size-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-orange">
                {c.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* 1. Core Architecture */}
      <h2 id="architecture" className="mt-14 text-2xl font-bold flex items-center gap-2">
        <Layers className="size-6 text-orange" />
        Core Architecture
      </h2>
      <p className="mt-2 text-foreground/80 leading-relaxed text-sm">
        Nodebase is engineered as a highly scalable, event-driven orchestration platform.
        Similar to enterprise tools like n8n, Nodebase divides workflow management into three operational layers:
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
        <div className="rounded-lg border p-4 bg-muted/20">
          <h4 className="font-semibold text-foreground">1. Visual Builder (Canvas)</h4>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            A stateful, reactive interface built on React Flow. Developers design, inspect, and trace execution branches visually. Nodes declare structured inputs and output schema contracts.
          </p>
        </div>
        <div className="rounded-lg border p-4 bg-muted/20">
          <h4 className="font-semibold text-foreground">2. Asynchronous Queue Worker</h4>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            Powered by Inngest. Executions are offloaded to background task queues, allowing workflows to run reliably under heavy concurrency and isolate long-running requests without blocking.
          </p>
        </div>
        <div className="rounded-lg border p-4 bg-muted/20">
          <h4 className="font-semibold text-foreground">3. State Machine Context</h4>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            Workflows maintain a shared, immutable-on-write execution context. As each node resolves, its JSON output payload is merged into the master context object for downstream nodes to consume.
          </p>
        </div>
      </div>

      {/* 2. Execution & Data Flow */}
      <h2 id="data-flow" className="mt-14 text-2xl font-bold flex items-center gap-2">
        <Cpu className="size-6 text-orange" />
        Execution &amp; Data Flow Model
      </h2>
      <p className="mt-2 text-foreground/80 leading-relaxed text-sm">
        In Nodebase, data flows sequentially through nodes in a JSON format.
        You can template parameters dynamically in any node using Handlebars syntax.
      </p>
      <Callout type="info">
        <strong>Context Access:</strong> A node has read-access to the outputs of all previous steps. Use double curly braces to bind values: <code>{"{{nodeName.field}}"}</code>.
      </Callout>
      
      <p className="mt-4 text-sm text-foreground/80 font-medium">Example Execution Context Stack:</p>
      <CodeBlock
        language="json"
        code={`{
  "trigger": {
    "body": {
      "customerId": "cust_9812",
      "amount": 4999
    }
  },
  "customerSearch": {
    "records": [
      { "id": "rec_01", "name": "Aman Sen", "email": "aman@example.com" }
    ]
  },
  "myAI": {
    "text": "Dear Aman, thank you for your payment..."
  }
}`}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        To reference the customer's email in a downstream Email node, configure the recipient field as <code>{"{{customerSearch.records.0.email}}"}</code>.
      </p>

      {/* 3. Security and Sandboxing */}
      <h2 id="security" className="mt-14 text-2xl font-bold flex items-center gap-2">
        <Shield className="size-6 text-orange" />
        Enterprise-Grade Security Vault
      </h2>
      <p className="mt-2 text-foreground/80 leading-relaxed text-sm">
        Handling production credentials demands strict isolation. Nodebase incorporates multi-tenant security structures to safeguard secrets:
      </p>
      <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-muted-foreground">
        <li>
          <strong className="text-foreground">AES-256-GCM Credential Encryption:</strong> All credentials (API keys, OAuth tokens) are encrypted at rest. The encryption key is isolated in environment variables and never written to database tables or logs.
        </li>
        <li>
          <strong className="text-foreground">Sandbox Execution Environment:</strong> The <strong>Code Node</strong> runs custom JavaScript inside isolated processes to prevent malicious scripts from accessing system memory, environment flags, or file structures.
        </li>
        <li>
          <strong className="text-foreground">Masked Logging Output:</strong> Workflow execution logs automatically strip headers and configuration parameters tagged as credentials to avoid leaking secrets in tracing views.
        </li>
      </ul>

      {/* 4. Resiliency & Scale */}
      <h2 id="resiliency" className="mt-14 text-2xl font-bold flex items-center gap-2">
        <RefreshCw className="size-6 text-orange" />
        Resiliency &amp; Rate-Limit Handling
      </h2>
      <p className="mt-2 text-foreground/80 leading-relaxed text-sm">
        Production workloads must survive external API downtime, network hiccups, and rate limits. Nodebase implements defensive execution structures:
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
        <div className="rounded-lg border p-4 bg-muted/20">
          <h4 className="font-semibold text-foreground flex items-center gap-1.5">
            <Zap className="size-4 text-orange" />
            Automatic Exponential Backoff
          </h4>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            Nodes targeting third-party services (such as OpenAI or Razorpay) automatically catch 429 (Too Many Requests) or 503 (Service Unavailable) status codes and queue a retry utilizing progressive delays.
          </p>
        </div>
        <div className="rounded-lg border p-4 bg-muted/20">
          <h4 className="font-semibold text-foreground flex items-center gap-1.5">
            <SlidersHorizontal className="size-4 text-orange" />
            Continue on Fail &amp; Fallbacks
          </h4>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            Configure individual steps to "Continue on Fail". When active, a failed node outputs an <code>error</code> object into the context and allows execution to proceed, enabling developers to build custom error paths.
          </p>
        </div>
      </div>

      {/* Node categories */}
      <h2 id="categories" className="mt-14 text-2xl font-bold">
        Node Categories
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        29 nodes across 6 core categories — click a category to view the reference docs.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className="group rounded-lg border border-border p-4 transition-colors hover:border-orange/40 hover:bg-orange-subtle"
          >
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cat.color}`}
            >
              {cat.title}
            </span>
            <p className="mt-2 text-sm text-muted-foreground">{cat.desc}</p>
          </Link>
        ))}
      </div>

      {/* Popular Nodes */}
      <h2 id="popular-nodes" className="mt-14 text-2xl font-bold">
        Popular Nodes
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Jump directly to a node&apos;s detailed reference page.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {popularNodes.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="group flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:border-orange/40 hover:bg-orange-subtle"
          >
            {n.logo ? (
              <img
                src={n.logo}
                alt={n.title}
                className="size-6 object-contain rounded-sm opacity-50 group-hover:opacity-100 transition-opacity"
              />
            ) : n.icon ? (
              <n.icon className="size-6 text-muted-foreground group-hover:text-orange" />
            ) : null}
            <span className="text-sm font-medium text-foreground group-hover:text-orange">
              {n.title}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
