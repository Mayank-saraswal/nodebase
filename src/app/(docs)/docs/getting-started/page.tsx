import type { Metadata } from "next";
import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { Breadcrumb, PrevNextLinks } from "@/components/docs/docs-shell";

export const metadata: Metadata = { title: "Getting Started" };

export default function GettingStartedPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Getting Started" }]} />

      <h1 className="text-4xl font-bold tracking-tight">
        Getting Started with Nodebase
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        A comprehensive developer guide to building, running, and scaling visual workflows in minutes.
      </p>

      {/* ---- Section 1: Overview ---- */}
      <h2 id="what-is-nodebase" className="mt-12 text-2xl font-bold">
        1. What is Nodebase?
      </h2>
      <p className="mt-3 leading-relaxed text-foreground/80 text-sm">
        Nodebase is a visual workflow automation platform designed for modern product and operations teams. 
        Through an intuitive drag-and-drop canvas, you can connect SaaS APIs, database queries, logic filters, and AI agents into reliable, event-driven pipelines.
      </p>

      {/* ---- Section 2: Core Concepts ---- */}
      <h2 id="core-concepts" className="mt-12 text-2xl font-bold">
        2. Core Concepts
      </h2>
      <p className="mt-2 text-foreground/80 text-sm">
        Before assembling your first workspace, familiarize yourself with the three core tenets of Nodebase:
      </p>

      <div className="mt-4 space-y-6 text-sm">
        <div>
          <h3 className="text-lg font-semibold text-foreground">A. Workflows &amp; Directing Graph</h3>
          <p className="mt-1.5 text-muted-foreground leading-relaxed">
            A workflow is a directed graph of nodes connected together. The workspace executes sequentially or splits into parallel branches based on conditional outputs.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground">B. Triggers vs. Actions vs. Logic Nodes</h3>
          <p className="mt-1.5 text-muted-foreground leading-relaxed">
            Every pipeline contains three distinct categories of nodes:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground ml-3">
            <li><strong>Triggers (Entrypoints):</strong> Starts the execution. Can be a <em>Manual Trigger</em>, a scheduled cron-like <em>Schedule Trigger</em>, or an HTTP <em>Webhook Trigger</em>.</li>
            <li><strong>Actions (Integrations):</strong> Performs tasks inside third-party APIs (e.g., Slack, Gmail, Google Sheets, Razorpay).</li>
            <li><strong>Logic &amp; Utility Nodes:</strong> Structures data flows (e.g., <em>If/Else</em> branches, <em>Code</em> execution, <em>Loops</em>, <em>HTTP Requests</em>).</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground">C. Execution Context State</h3>
          <p className="mt-1.5 text-muted-foreground leading-relaxed">
            As a workflow runs, Nodebase aggregates outputs into a single JSON object called the <strong>Context</strong>. 
            When a node resolves, its return payload is automatically appended under its configured <code>Variable Name</code>.
          </p>
          <CodeBlock
            language="json"
            title="Shared Context JSON Example"
            code={`{
  "webhookTrigger": {
    "body": {
      "customer_email": "vijay@company.in",
      "plan": "enterprise"
    },
    "headers": {
      "host": "nodebase.mayanksaraswal.in"
    }
  },
  "crmLookup": {
    "ok": true,
    "data": {
      "lead_score": 92,
      "company": "Vijay Enterprises"
    }
  }
}`}
          />
          <Callout type="tip">
            Downstream steps retrieve these values utilizing Handlebars bindings. E.g. <code>{"{{crmLookup.data.lead_score}}"}</code> resolves to <code>92</code>.
          </Callout>
        </div>
      </div>

      {/* ---- Section 3: Handlebars Syntax ---- */}
      <h2 id="handlebars-syntax" className="mt-12 text-2xl font-bold">
        3. Dynamic Templating Syntax
      </h2>
      <p className="mt-3 leading-relaxed text-foreground/80 text-sm">
        Parameter fields within Nodebase nodes accept Handlebars tags. These expressions are resolved at runtime prior to execution.
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left font-semibold">Syntax Pattern</th>
              <th className="px-4 py-2.5 text-left font-semibold">Description / Output Type</th>
              <th className="px-4 py-2.5 text-left font-semibold">Example Output</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="px-4 py-2.5 font-mono text-xs text-orange">{"{{variableName.field}}"}</td>
              <td className="px-4 py-2.5 text-muted-foreground text-xs">Accesses a specific parameter value.</td>
              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">"vijay@company.in"</td>
            </tr>
            <tr className="border-b border-border bg-muted/30">
              <td className="px-4 py-2.5 font-mono text-xs text-orange">{"{{json variableName}}"}</td>
              <td className="px-4 py-2.5 text-muted-foreground text-xs">Stringifies an entire object structure (ideal for raw HTTP bodies).</td>
              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{"{\"customer_email\":\"vijay...\"}"}</td>
            </tr>
            <tr className="border-b border-border">
              <td className="px-4 py-2.5 font-mono text-xs text-orange">{"{{variableName.list.0.name}}"}</td>
              <td className="px-4 py-2.5 text-muted-foreground text-xs">Accesses specific elements in a zero-indexed array.</td>
              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">"Vijay Enterprises"</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---- Section 4: Step-by-Step Tutorial ---- */}
      <h2 id="tutorial" className="mt-14 text-2xl font-bold">
        4. Step-by-Step Tutorial: Building a Lead Routing Pipeline
      </h2>
      <p className="mt-2 text-foreground/80 text-sm">
        Follow this tutorial to build a workflow that routes premium webhook leads into custom communication channels.
      </p>

      <div className="mt-6 space-y-6 text-sm">
        <div className="flex gap-4">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange/10 font-bold text-orange text-xs mt-0.5">1</div>
          <div>
            <h4 className="font-semibold text-foreground">Initialize the Workflow Canvas</h4>
            <p className="mt-1 text-muted-foreground leading-relaxed">
              Navigate to the <strong>Workflows</strong> dashboard tab. Click <strong>New Workflow</strong>. 
              You will be presented with a grid-based canvas. Change the workflow name at the top to <em>Lead Routing System</em>.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange/10 font-bold text-orange text-xs mt-0.5">2</div>
          <div>
            <h4 className="font-semibold text-foreground">Configure the Webhook Trigger</h4>
            <p className="mt-1 text-muted-foreground leading-relaxed">
              Drag the <strong>Webhook Trigger</strong> from the sidebar nodes library onto the canvas. Double-click it to open settings:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground ml-3">
              <li>Set the **Variable Name** to <code>webhook</code>.</li>
              <li>Under URL paths, copy the unique production webhook endpoint. This endpoint accepts `POST` payloads.</li>
              <li>Click **Save**. Connect this node as the origin.</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange/10 font-bold text-orange text-xs mt-0.5">3</div>
          <div>
            <h4 className="font-semibold text-foreground">Add Conditional Logic (If/Else Node)</h4>
            <p className="mt-1 text-muted-foreground leading-relaxed">
              Drag an <strong>If/Else</strong> logic node and link the output port of the Webhook Trigger to its input port. Double-click the If/Else node to configure:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground ml-3">
              <li>For the **Value A** field, type <code>{"{{webhook.body.deal_value}}"}</code>.</li>
              <li>Set the **Operator** dropdown to **Greater Than**.</li>
              <li>For **Value B**, enter <code>10000</code>.</li>
              <li>Click **Save**. The If/Else node now splits the path into two output branches: <code>true</code> and <code>false</code>.</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange/10 font-bold text-orange text-xs mt-0.5">4</div>
          <div>
            <h4 className="font-semibold text-foreground">Integrate Slack Alerts (Premium Path)</h4>
            <p className="mt-1 text-muted-foreground leading-relaxed">
              Connect a <strong>Slack Node</strong> to the <code>true</code> (upper) output port of the If/Else node:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground ml-3">
              <li>Select your configured Slack credentials (or add a webhook in Credentials).</li>
              <li>Set the channel to <code>#sales-alerts</code>.</li>
              <li>Configure the message template as: <code>"🔥 Premium Lead Alert! Customer: {"{{webhook.body.name}}"} (Company: {"{{webhook.body.company}}"}) has requested a demo. Value: ${"{{webhook.body.deal_value}}"}!"</code>.</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange/10 font-bold text-orange text-xs mt-0.5">5</div>
          <div>
            <h4 className="font-semibold text-foreground">Integrate Email Automation (Standard Path)</h4>
            <p className="mt-1 text-muted-foreground leading-relaxed">
              Connect a <strong>Gmail Node</strong> to the <code>false</code> (lower) output port of the If/Else node:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground ml-3">
              <li>Select your Google credential.</li>
              <li>Set the **Recipient** to <code>{"{{webhook.body.email}}"}</code>.</li>
              <li>Set the **Subject** to <code>"Thank you for contacting us!"</code>.</li>
              <li>In the body, write a warm thank-you note referencing their company name: <code>{"Hi {{webhook.body.name}}, thanks for reaching out. We have logged your request for {{webhook.body.company}}..."}</code>.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ---- Section 5: Run & Debug ---- */}
      <h2 id="execute-debug" className="mt-14 text-2xl font-bold">
        5. Execution, Testing &amp; Debugging
      </h2>
      <p className="mt-2 text-foreground/80 leading-relaxed text-sm">
        To test your new pipeline, you must simulate or trigger an execution:
      </p>
      
      <h3 className="mt-4 font-semibold text-foreground text-sm">A. Triggering the Flow</h3>
      <p className="mt-1 text-muted-foreground text-sm">
        Send a test HTTP request to your copied Webhook URL using curl, Postman, or a similar utility:
      </p>
      <CodeBlock
        language="bash"
        code={`curl -X POST https://nodebase.mayanksaraswal.in/api/v1/webhooks/YOUR_KEY \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Vijay Sen", "company": "Vijay Enterprises", "email": "vijay@company.in", "deal_value": 15000}'`}
      />

      <h3 className="mt-6 font-semibold text-foreground text-sm">B. Inspecting Execution Run Logs</h3>
      <p className="mt-1 text-muted-foreground text-sm">
        Once sent, the canvas updates in real-time:
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1.5 text-xs text-muted-foreground ml-2">
        <li><strong>Status Badges:</strong> Every node displays a colored ring (Green: Success, Red: Failed, Orange: Processing).</li>
        <li><strong>Variables Context Panel:</strong> Click on any node to view the JSON snapshot of the workflow context at the moment that specific node completed. This makes tracking Handlebars resolution bugs simple.</li>
        <li><strong>Execution Logs:</strong> The **Runs** pane lists historic workflows. Click any run ID to replay or debug the execution path.</li>
      </ul>

      {/* ---- Section 6: Credentials ---- */}
      <h2 id="credentials" className="mt-14 text-2xl font-bold">
        6. Setting Up Credentials
      </h2>
      <p className="mt-3 leading-relaxed text-foreground/80 text-sm">
        To maintain clean segregation, API tokens and OAuth connections are managed in the centralized credential manager:
      </p>
      <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-muted-foreground">
        <li>Navigate to the **Settings → Credentials** screen in the dashboard menu.</li>
        <li>Click **Add Credential** and select your application type.</li>
        <li>Input the keys or complete the OAuth popup authorization (for services like Gmail or Google Sheets).</li>
        <li>Once saved, these credentials become selectable in the corresponding canvas nodes.</li>
      </ol>
      <Callout type="warning">
        Credential configurations are encrypted with AES-256 keys. Never share workflow screenshots displaying raw API tokens in prompt texts; always store keys in the credential manager.
      </Callout>

      <PrevNextLinks />
    </>
  );
}
