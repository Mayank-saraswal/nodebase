import type { Metadata } from "next";
import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { Breadcrumb, PrevNextLinks } from "@/components/docs/docs-shell";

export const metadata: Metadata = { title: "Schedule Trigger" };

export default function ScheduleTriggerDocPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Nodes", href: "/docs/nodes" }, { label: "Schedule Trigger" }]} />

      <h1 className="text-4xl font-bold tracking-tight">Schedule Trigger</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Automate workflows on recurring schedules using visual rules or standard cron expressions.
      </p>

      {/* ---- Section 1: Overview ---- */}
      <h2 id="overview" className="mt-12 text-2xl font-bold">
        1. Operational Mechanics
      </h2>
      <p className="mt-3 leading-relaxed text-foreground/80 text-sm">
        The Schedule Trigger executes your workflows automatically at specified time intervals. 
        It is fully managed by our background runner, supporting timezone offsets to ensure executions match your business hours.
      </p>

      {/* ---- Section 2: Dual-Mode Configuration ---- */}
      <h2 id="modes" className="mt-12 text-2xl font-bold">
        2. Dual-Mode Builder Configuration
      </h2>
      <p className="mt-2 text-foreground/80 text-sm">
        Double-click the Schedule Trigger node on the canvas to open settings. You can switch between two interface modes:
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
        <div className="rounded-lg border p-4 bg-muted/20">
          <h4 className="font-semibold text-foreground">Visual Builder Mode</h4>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            Quickly construct schedules using dropdown selections:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground ml-2">
            <li><strong>Interval:</strong> Every Minute, Every Hour, Every Day, Every Week, or Every Month.</li>
            <li><strong>Specific Time:</strong> Choose the hour and minute (e.g. 09:30).</li>
            <li><strong>Days List:</strong> Check active weekdays (Mon - Sun).</li>
            <li><strong>Month Date:</strong> Choose a monthly day (1 - 31).</li>
          </ul>
        </div>

        <div className="rounded-lg border p-4 bg-muted/20">
          <h4 className="font-semibold text-foreground">Custom Expression Mode</h4>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            Input a standard 5-part cron pattern (Minute, Hour, Day of Month, Month, Day of Week). 
            Example expression:
          </p>
          <code className="mt-2 block rounded bg-muted px-2 py-1 text-xs font-mono text-orange w-fit">
            0 9 * * 1-5
          </code>
          <p className="mt-2 text-xs text-muted-foreground">
            This resolves to: <em>"At 09:00 AM, Monday through Friday."</em>
          </p>
        </div>
      </div>

      {/* ---- Section 3: Presets ---- */}
      <h2 id="presets" className="mt-12 text-2xl font-bold">
        3. Built-In Presets
      </h2>
      <p className="mt-2 text-foreground/80 text-sm">
        Save time by selecting one of our pre-built scheduling shortcuts inside the node settings panel:
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left font-semibold">Preset Label</th>
              <th className="px-4 py-2.5 text-left font-semibold">Cron Pattern</th>
              <th className="px-4 py-2.5 text-left font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="px-4 py-2.5 text-foreground text-xs font-medium">Every minute</td>
              <td className="px-4 py-2.5 font-mono text-xs text-orange"><code>* * * * *</code></td>
              <td className="px-4 py-2.5 text-muted-foreground text-xs">Fires once per minute. Useful for high-frequency checks.</td>
            </tr>
            <tr className="border-b border-border bg-muted/30">
              <td className="px-4 py-2.5 text-foreground text-xs font-medium">Every 5 minutes</td>
              <td className="px-4 py-2.5 font-mono text-xs text-orange"><code>*/5 * * * *</code></td>
              <td className="px-4 py-2.5 text-muted-foreground text-xs">Runs at minute marks divisible by 5.</td>
            </tr>
            <tr className="border-b border-border">
              <td className="px-4 py-2.5 text-foreground text-xs font-medium">Every hour</td>
              <td className="px-4 py-2.5 font-mono text-xs text-orange"><code>0 * * * *</code></td>
              <td className="px-4 py-2.5 text-muted-foreground text-xs">Fires at the start of every hour.</td>
            </tr>
            <tr className="border-b border-border bg-muted/30">
              <td className="px-4 py-2.5 text-foreground text-xs font-medium">Every day at 9am</td>
              <td className="px-4 py-2.5 font-mono text-xs text-orange"><code>0 9 * * *</code></td>
              <td className="px-4 py-2.5 text-muted-foreground text-xs">Daily recurring task at 09:00 AM.</td>
            </tr>
            <tr className="border-b border-border">
              <td className="px-4 py-2.5 text-foreground text-xs font-medium">Every weekday 9am</td>
              <td className="px-4 py-2.5 font-mono text-xs text-orange"><code>0 9 * * 1-5</code></td>
              <td className="px-4 py-2.5 text-muted-foreground text-xs">Runs Monday through Friday. Great for work hours sync.</td>
            </tr>
            <tr className="bg-muted/30">
              <td className="px-4 py-2.5 text-foreground text-xs font-medium">First of month</td>
              <td className="px-4 py-2.5 font-mono text-xs text-orange"><code>0 0 1 * *</code></td>
              <td className="px-4 py-2.5 text-muted-foreground text-xs">Fires at midnight on the first day of each calendar month.</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---- Section 4: Timezones & Activation ---- */}
      <h2 id="timezones-activation" className="mt-12 text-2xl font-bold">
        4. Timezones &amp; Active State
      </h2>
      <div className="mt-3 space-y-4 text-sm leading-relaxed">
        <div>
          <h3 className="font-semibold text-foreground">Timezone Alignment</h3>
          <p className="text-muted-foreground text-xs">
            By default, all schedules evaluate in <strong>UTC</strong>. You can change this behavior via the **Timezone** dropdown:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground ml-2">
            <li>Supports standard offsets (e.g. <code>Asia/Kolkata</code>, <code>America/New_York</code>, <code>Europe/London</code>).</li>
            <li>Automatically calculates daylight savings shift values to keep triggers aligned to local times.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Activating vs. Pausing</h3>
          <p className="text-muted-foreground text-xs">
            After configuring your schedule trigger, click **Save Schedule**.
            You must then toggle the state to <strong>Activate</strong>. If paused, the cron runner ignores the trigger events.
          </p>
        </div>
      </div>

      {/* ---- Section 5: Context Schemas ---- */}
      <h2 id="context" className="mt-12 text-2xl font-bold">
        5. Output Context Variables
      </h2>
      <p className="mt-2 text-foreground/80 text-sm">
        When the trigger fires, the following data context is injected into your workflow:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "schedule": {
    "firedAt": "2026-06-04T01:18:46.000Z",
    "workflowId": "wf_sec_90812"
  }
}`}
      />
      <div className="mt-3 overflow-hidden rounded-lg border border-border text-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 text-left font-semibold">Variable Binding</th>
              <th className="px-4 py-2 text-left font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="px-4 py-2 font-mono text-xs text-orange">{"{{schedule.firedAt}}"}</td>
              <td className="px-4 py-2 text-xs text-muted-foreground">The ISO timestamp of the trigger run event.</td>
            </tr>
            <tr className="border-b border-border bg-muted/30">
              <td className="px-4 py-2 font-mono text-xs text-orange">{"{{schedule.workflowId}}"}</td>
              <td className="px-4 py-2 text-xs text-muted-foreground">The ID of the current executing workflow.</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-xs text-orange">{"{{json schedule}}"}</td>
              <td className="px-4 py-2 text-xs text-muted-foreground">Serializes the schedule trigger object data.</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---- Section 6: Real-world Examples ---- */}
      <h2 id="examples" className="mt-14 text-2xl font-bold">
        6. Real-World Execution Examples
      </h2>

      <div className="mt-6 space-y-8 text-sm">
        {/* Example 1 */}
        <div className="rounded-lg border p-5">
          <h3 className="font-bold text-foreground text-base">Example 1: Daily CRM Sync &amp; Backup (Daily 9am)</h3>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            Ensure customer records from Notion are backed up into Google Sheets daily at start of business.
          </p>
          <ul className="mt-3 list-inside list-decimal space-y-1 text-xs text-muted-foreground">
            <li>Set Schedule Trigger to **Every Day** at Hour: <code>09</code> Minute: <code>00</code>.</li>
            <li>Connect a **Notion Node** set to **Read Database** to retrieve active customer records.</li>
            <li>Connect a **Loop Node** iterating over Notion results.</li>
            <li>Within the loop, add a **Google Sheets Node** appending the contact rows.</li>
          </ul>
        </div>

        {/* Example 2 */}
        <div className="rounded-lg border p-5">
          <h3 className="font-bold text-foreground text-base">Example 2: Weekly Invoicing Report Dispatch (Mondays 9am)</h3>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            Query your payment gateway (Razorpay) for payouts and compile a report email for the finance department.
          </p>
          <ul className="mt-3 list-inside list-decimal space-y-1 text-xs text-muted-foreground">
            <li>Set Schedule Trigger to **Every Week** checking **Mon** at Hour: <code>09</code> Minute: <code>00</code>.</li>
            <li>Connect a **Razorpay Node** set to **List Payouts** (filtering payouts from the past week).</li>
            <li>Add a **Code Node** formatting payouts into an HTML summary table.</li>
            <li>Add a **Gmail Node** sending the summary email to <code>finance@company.in</code>.</li>
          </ul>
        </div>

        {/* Example 3 */}
        <div className="rounded-lg border p-5">
          <h3 className="font-bold text-foreground text-base">Example 3: 5-Minute API Endpoint Health Ping</h3>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            Build a custom server monitoring tool checking system health status endpoints every 5 minutes.
          </p>
          <ul className="mt-3 list-inside list-decimal space-y-1 text-xs text-muted-foreground">
            <li>Set Schedule Trigger to preset **Every 5 minutes** (<code>*/5 * * * *</code>).</li>
            <li>Add an **HTTP Request Node** pointing to your microservice: <code>https://api.company.in/health</code>.</li>
            <li>Add an **If/Else Node** checking: <code>{"{{httpRequest.statusCode}}"}</code> **Not Equals** <code>200</code>.</li>
            <li>Connect the **true** branch to a **Slack Node** to dispatch urgent developer notifications.</li>
          </ul>
        </div>
      </div>

      <PrevNextLinks />
    </>
  );
}
