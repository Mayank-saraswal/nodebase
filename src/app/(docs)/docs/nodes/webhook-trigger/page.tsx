import type { Metadata } from "next";
import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { Breadcrumb, PrevNextLinks } from "@/components/docs/docs-shell";

export const metadata: Metadata = { title: "Webhook Trigger" };

export default function WebhookTriggerDocPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Nodes", href: "/docs/nodes" }, { label: "Webhook Trigger" }]} />

      <h1 className="text-4xl font-bold tracking-tight">Webhook Trigger</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Trigger workflows instantly by receiving HTTP requests from external systems, SaaS providers, or custom apps.
      </p>

      {/* ---- Section 1: Overview ---- */}
      <h2 id="overview" className="mt-12 text-2xl font-bold">
        1. Operational Mechanics
      </h2>
      <p className="mt-3 leading-relaxed text-foreground/80 text-sm">
        The Webhook Trigger acts as an instant entry point for your Nodebase workflows. 
        When you add a Webhook Trigger, Nodebase registers a unique, public endpoint to receive incoming HTTP requests.
      </p>
      <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-muted-foreground">
        <li>
          <strong className="text-foreground">Supported Methods:</strong> <code>GET</code> and <code>POST</code>.
        </li>
        <li>
          <strong className="text-foreground">URL Format:</strong> <code>https://nodebase.mayanksaraswal.in/api/webhooks/trigger/{"{webhookId}"}</code>
        </li>
        <li>
          <strong className="text-foreground">Payload Size Limit:</strong> Up to <strong>1MB</strong>. Payloads exceeding this limit receive an immediate <code>413 Payload Too Large</code> response.
        </li>
      </ul>

      {/* ---- Section 2: Deduplication & Idempotency ---- */}
      <h2 id="idempotency" className="mt-12 text-2xl font-bold">
        2. Redis Idempotency &amp; Deduplication Vault
      </h2>
      <p className="mt-2 text-foreground/80 text-sm leading-relaxed">
        To prevent double-executions from webhook retries (often sent automatically by external platforms during transient outages), 
        Nodebase implements a Redis-backed <strong>5-minute (300-second) deduplication window</strong>.
      </p>
      
      <h3 className="mt-4 font-semibold text-foreground text-sm">How Fingerprinting Works</h3>
      <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
        For each incoming request, Nodebase computes a SHA-256 fingerprint from:
      </p>
      <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-muted-foreground ml-3">
        <li>The HTTP Method (<code>POST</code> vs <code>GET</code>).</li>
        <li>
          Specific request headers: <code>content-type</code>, <code>user-agent</code>, 
          and client idempotency keys: <code>idempotency-key</code>, <code>x-idempotency-key</code>, or <code>x-request-id</code>.
        </li>
        <li>The request body (for POST) or stringified query params (for GET).</li>
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        If a second request matching this fingerprint arrives within 300 seconds, Nodebase discards the duplicate execution and immediately returns:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "success": true,
  "status": "duplicate_discarded"
}`}
      />

      {/* ---- Section 3: Context Outputs ---- */}
      <h2 id="context-schemas" className="mt-12 text-2xl font-bold">
        3. Output Context Schemas
      </h2>
      <p className="mt-2 text-foreground/80 text-sm">
        Depending on the HTTP method, the output context written into the workflow state changes:
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
        <div>
          <h4 className="font-semibold text-foreground">POST Context Format</h4>
          <CodeBlock
            language="json"
            code={`{
  "webhook": {
    "body": {
      "leadId": "ld_98",
      "email": "amit@sharma.in"
    },
    "headers": {
      "content-type": "application/json",
      "user-agent": "Mozilla..."
    },
    "method": "POST",
    "receivedAt": "2026-06-04T01:14Z"
  }
}`}
          />
        </div>

        <div>
          <h4 className="font-semibold text-foreground">GET Context Format</h4>
          <CodeBlock
            language="json"
            code={`{
  "webhook": {
    "body": null,
    "headers": {
      "user-agent": "Mozilla..."
    },
    "method": "GET",
    "queryParams": {
      "source": "facebook",
      "campaign": "brand"
    },
    "receivedAt": "2026-06-04T01:14Z"
  }
}`}
          />
        </div>
      </div>

      {/* ---- Section 4: Variable Reference Table ---- */}
      <h2 id="variables" className="mt-12 text-2xl font-bold">
        4. Reference Variables
      </h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left font-semibold">Variable Binding</th>
              <th className="px-4 py-2.5 text-left font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="px-4 py-2.5 font-mono text-xs text-orange">{"{{webhook.body}}"}</td>
              <td className="px-4 py-2.5 text-muted-foreground text-xs">Accesses parsed JSON body elements (POST only).</td>
            </tr>
            <tr className="border-b border-border bg-muted/30">
              <td className="px-4 py-2.5 font-mono text-xs text-orange">{"{{webhook.queryParams}}"}</td>
              <td className="px-4 py-2.5 text-muted-foreground text-xs">Accesses query string keys (GET only).</td>
            </tr>
            <tr className="border-b border-border">
              <td className="px-4 py-2.5 font-mono text-xs text-orange">{"{{webhook.headers}}"}</td>
              <td className="px-4 py-2.5 text-muted-foreground text-xs">Accesses request metadata headers. Use dot-notation (e.g. <code>{"{{webhook.headers.content-type}}"}</code>).</td>
            </tr>
            <tr className="bg-muted/30">
              <td className="px-4 py-2.5 font-mono text-xs text-orange">{"{{json webhook}}"}</td>
              <td className="px-4 py-2.5 text-muted-foreground text-xs">Serializes the complete webhook event data stack.</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---- Section 5: Real-world Examples ---- */}
      <h2 id="examples" className="mt-14 text-2xl font-bold">
        5. Real-World Execution Examples
      </h2>

      <div className="mt-6 space-y-8 text-sm">
        {/* Example 1 */}
        <div className="rounded-lg border p-5">
          <h3 className="font-bold text-foreground text-base">Example 1: E-commerce Lead Capture (POST)</h3>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            Configure your landing page form to send details to Nodebase. The workflow checks validation parameters and automatically routes prospects to your CRM.
          </p>
          <div className="mt-4">
            <p className="font-semibold text-foreground text-xs">Trigger Command:</p>
            <CodeBlock
              language="bash"
              code={`curl -X POST https://nodebase.mayanksaraswal.in/api/webhooks/trigger/YOUR_WEBHOOK_ID \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Ananya Roy", "email": "ananya@roy.in", "budget": 15000}'`}
            />
          </div>
          <div className="mt-3">
            <p className="font-semibold text-foreground text-xs">CRM Node Configuration:</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add an HTTP Request node to append values: Use <code>{"{{webhook.body.name}}"}</code> and <code>{"{{webhook.body.email}}"}</code> to bind inputs dynamically.
            </p>
          </div>
        </div>

        {/* Example 2 */}
        <div className="rounded-lg border p-5">
          <h3 className="font-bold text-foreground text-base">Example 2: Ping Check / Health Status Query (GET)</h3>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            Monitor microservice heartbeat status. External servers fire query strings to trigger simple actions or record health status updates.
          </p>
          <div className="mt-4">
            <p className="font-semibold text-foreground text-xs">Trigger Command:</p>
            <CodeBlock
              language="bash"
              code={`curl -X GET "https://nodebase.mayanksaraswal.in/api/webhooks/trigger/YOUR_WEBHOOK_ID?server=auth-service&status=healthy"`}
            />
          </div>
          <div className="mt-3">
            <p className="font-semibold text-foreground text-xs">Dynamic Message Template:</p>
            <p className="text-xs text-muted-foreground mt-1">
              Notify Slack using the template: <code>"Server health update: {"{{webhook.queryParams.server}}"} reports state: {"{{webhook.queryParams.status}}"}"</code>.
            </p>
          </div>
        </div>

        {/* Example 3 */}
        <div className="rounded-lg border p-5">
          <h3 className="font-bold text-foreground text-base">Example 3: Secure Webhook Handshake Verification</h3>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            Verify custom token signatures sent in headers (e.g. Stripe signatures or custom auth headers) before invoking downstream logic nodes.
          </p>
          <div className="mt-4">
            <p className="font-semibold text-foreground text-xs">Trigger Command:</p>
            <CodeBlock
              language="bash"
              code={`curl -X POST https://nodebase.mayanksaraswal.in/api/webhooks/trigger/YOUR_WEBHOOK_ID \\
  -H "Authorization: Bearer my-secure-token-123" \\
  -H "Content-Type: application/json" \\
  -d '{"event": "system.upgrade"}'`}
            />
          </div>
          <div className="mt-3">
            <p className="font-semibold text-foreground text-xs">If/Else Validator Logic:</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add an If/Else Node directly after the trigger.
              Configure condition: <code>{"{{webhook.headers.authorization}}"}</code> **Equals** <code>Bearer my-secure-token-123</code>. 
              Only branch executions to the <code>true</code> port to safeguard downstream APIs.
            </p>
          </div>
        </div>
      </div>

      <PrevNextLinks />
    </>
  );
}
