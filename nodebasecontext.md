# NodebaseContext — Full Node & Flow Deep-Dive

This file documents the node system in this repository (Nodebase), including:

- all node types currently registered in code,
- specialties and limitations of each node,
- operation counts per node,
- operation lists for operation-driven nodes,
- schema/storage model mapping,
- runtime execution flow,
- file structure and technical depth for implementation areas.

---

## 1) Source of truth used for this document

This document is based on:

- Prisma schema: `prisma/schema.prisma`
- Node registry: `src/features/executions/lib/executor-registry.ts`
- Node UI mapping: `src/config/node-components.ts`
- Workflow engine: `src/inngest/functions.ts`
- Existing node reference: `NODES.md`

---

## 2) Platform architecture at a technical level

## 2.1 Runtime model

1. A workflow run starts when event `workflow/execute.workflow` is received in Inngest.
2. Execution row is created in DB (`Execution` model).
3. Workflow graph is loaded (`workflow`, `nodes`, `connections`) and topologically sorted.
4. Shared context is initialized from trigger payload (`initialData`) + internal `__executionId`.
5. Engine builds execution levels (`buildExecutionLevels`) and runs:
   - sequential path for single-node levels or levels containing `LOOP`,
   - parallel path for independent nodes in the same level.
6. Each node executor receives:
   - node config `data`,
   - `context`,
   - `nodeId`, `userId`,
   - `step` (durable step tools),
   - `publish` (realtime status channel),
   - workflow graph metadata.
7. Node execution snapshots are persisted in `NodeExecution` with input/output/error/duration/order.
8. Branching logic applies skip propagation for non-selected IF/SWITCH paths.
9. Loop marks downstream node IDs as internally executed (`_executedByLoop`) to prevent double execution.
10. On success, `Execution.status = SUCCESS`; on failure, `onFailure` marks execution failed and fires error-triggered workflow path.

## 2.2 Data model backbone

- `Node` = visual node instance (type, data, position, credential link).
- `Connection` = directed edge with `fromOutput`/`toInput` handles.
- `Execution` = one workflow run.
- `NodeExecution` = per-node run snapshot and telemetry.
- Type-specific models store persistent config for specialized nodes.

## 2.3 Node registration lifecycle

To become runnable, a node must be wired in all relevant places:

1. `NodeType` enum in Prisma.
2. UI mapping in `node-components.ts`.
3. Executor mapping in `executor-registry.ts`.
4. Router/actions/dialog/executor/channel/webhook files as needed.
5. Delete mutation wiring in editor callback (for DB cleanup on canvas deletion).

---

## 3) Repository structure (node-related file structure)

## 3.1 Root and infra

- `prisma/schema.prisma`  
  Full DB schema: NodeType enum, node config models, operation enums.
- `src/inngest/functions.ts`  
  Main workflow executor + error-triggered executor.
- `src/inngest/channels/*`  
  Realtime channel definitions for node status updates.

## 3.2 UI + node canvas

- `src/config/node-components.ts`  
  Maps `NodeType -> ReactFlow node component`.
- `src/features/editer/components/editor.tsx`  
  Canvas runtime, execution trigger controls, delete cleanup hooks.

## 3.3 Node implementation layout

- Execution nodes:  
  `src/features/executions/components/<node>/`
  - `node.tsx` (canvas node)
  - `dialog.tsx` (configuration UI)
  - `executor.ts` (runtime operation logic)
  - optional `actions.ts`, `schemas.ts`, helpers, tests

- Trigger nodes:  
  `src/features/triggers/components/<trigger>/`
  - similar layout; trigger-specific executors/webhook mechanics

## 3.4 Server/API layer

- Routers in `src/server/routers/*`
- Webhook handlers in `src/app/api/webhooks/*`
- App router composition in `src/trpc/routers/_app.ts`

---

## 4) Node inventory with operation counts

> “Operations count” = number of distinct operation modes the node supports.
> For trigger/control nodes without an operation enum, count is 1.

| Node Type | Class | Operations |
|---|---|---:|
| INITIAL | Trigger bootstrap | 1 |
| MANUAL_TRIGGER | Trigger | 1 |
| HTTP_REQUEST | Execution | 1 (HTTP call mode with method variants) |
| GOOGLE_FORM_TRIGGER | Trigger | 1 |
| STRIPE_TRIGGER | Trigger | 1 |
| WEBHOOK_TRIGGER | Trigger | 1 |
| SCHEDULE_TRIGGER | Trigger | 1 |
| ANTHROPIC | AI (shared AINode) | 9 |
| GEMINI | AI (shared AINode) | 9 |
| OPENAI | AI (shared AINode) | 9 |
| GROQ | AI (shared AINode) | 9 |
| XAI | AI (shared AINode) | 9 |
| DISCORD | Communication | 1 |
| SLACK | Communication | 34 |
| DEEPSEEK | AI (shared AINode) | 9 |
| PERPLEXITY | AI (shared AINode) | 9 |
| TELEGRAM | Communication | 1 |
| X | Social | 1 |
| WORKDAY | Productivity | 1 |
| IF_ELSE | Control Flow | 1 |
| GMAIL | Communication | 18 |
| SET_VARIABLE | Data | 1 |
| GOOGLE_SHEETS | Data/Workspace | 10 |
| GOOGLE_DRIVE | Storage/Workspace | 4 |
| CODE | Logic/Compute | 1 |
| WHATSAPP | Communication | 5 |
| LOOP | Control Flow | 1 |
| NOTION | Productivity | 11 |
| RAZORPAY | Payments | 28 |
| SWITCH | Control Flow | 1 |
| WAIT | Control Flow | 3 wait modes |
| MERGE | Control Flow/Data | 5 merge modes |
| ERROR_TRIGGER | Trigger | 1 |
| RAZORPAY_TRIGGER | Trigger | 1 |
| WHATSAPP_TRIGGER | Trigger | 1 |
| MSG91 | Communication | 14 |
| SHIPROCKET | Logistics | 23 |
| ZOHO_CRM | CRM | 32 |
| HUBSPOT | CRM | 35 |
| FRESHDESK | Support/CRM | 31 |
| MEDIA_UPLOAD | Utility | 3 source modes |
| SORT | Utility/Data | 4 sort operations |

---

## 5) Full operation lists (enum-backed nodes)

## 5.1 AI operations (9) — shared across ANTHROPIC/GEMINI/OPENAI/GROQ/XAI/DEEPSEEK/PERPLEXITY

`CHAT`, `CHAT_WITH_HISTORY`, `STRUCTURED_OUTPUT`, `TOOL_USE`, `VISION`, `EMBED`, `TRANSCRIBE`, `GENERATE_IMAGE`, `CLASSIFY`

## 5.2 Gmail operations (18)

`SEND`, `REPLY`, `FORWARD`, `GET_MESSAGE`, `LIST_MESSAGES`, `SEARCH_MESSAGES`, `ADD_LABEL`, `REMOVE_LABEL`, `MARK_READ`, `MARK_UNREAD`, `MOVE_TO_TRASH`, `CREATE_DRAFT`, `GET_ATTACHMENT`, `GET_THREAD`, `LIST_LABELS`, `CREATE_LABEL`, `LIST_DRAFTS`, `SEND_DRAFT`

## 5.3 Google Drive operations (4)

`UPLOAD_FILE`, `DOWNLOAD_FILE`, `LIST_FILES`, `CREATE_FOLDER`

## 5.4 WhatsApp operations (5)

`SEND_TEXT`, `SEND_TEMPLATE`, `SEND_IMAGE`, `SEND_DOCUMENT`, `SEND_REACTION`

## 5.5 Notion operations (11)

`QUERY_DATABASE`, `CREATE_DATABASE_PAGE`, `UPDATE_DATABASE_PAGE`, `GET_PAGE`, `ARCHIVE_PAGE`, `APPEND_BLOCK`, `GET_BLOCK_CHILDREN`, `SEARCH`, `GET_DATABASE`, `GET_USER`, `GET_USERS`

## 5.6 Razorpay operations (28)

`ORDER_CREATE`, `ORDER_FETCH`, `ORDER_FETCH_PAYMENTS`, `ORDER_LIST`, `PAYMENT_FETCH`, `PAYMENT_CAPTURE`, `PAYMENT_LIST`, `PAYMENT_UPDATE`, `REFUND_CREATE`, `REFUND_FETCH`, `REFUND_LIST`, `CUSTOMER_CREATE`, `CUSTOMER_FETCH`, `CUSTOMER_UPDATE`, `SUBSCRIPTION_CREATE`, `SUBSCRIPTION_FETCH`, `SUBSCRIPTION_CANCEL`, `INVOICE_CREATE`, `INVOICE_FETCH`, `INVOICE_SEND`, `INVOICE_CANCEL`, `PAYMENT_LINK_CREATE`, `PAYMENT_LINK_FETCH`, `PAYMENT_LINK_UPDATE`, `PAYMENT_LINK_CANCEL`, `PAYOUT_CREATE`, `PAYOUT_FETCH`, `VERIFY_PAYMENT_SIGNATURE`

## 5.7 Slack operations (34)

`MESSAGE_SEND_WEBHOOK`, `MESSAGE_SEND`, `MESSAGE_UPDATE`, `MESSAGE_DELETE`, `MESSAGE_GET_PERMALINK`, `MESSAGE_SCHEDULE`, `MESSAGE_SEARCH`, `CHANNEL_GET`, `CHANNEL_LIST`, `CHANNEL_CREATE`, `CHANNEL_ARCHIVE`, `CHANNEL_UNARCHIVE`, `CHANNEL_INVITE`, `CHANNEL_KICK`, `CHANNEL_SET_TOPIC`, `CHANNEL_SET_PURPOSE`, `CHANNEL_HISTORY`, `CHANNEL_INFO`, `CHANNEL_RENAME`, `USER_GET`, `USER_GET_BY_EMAIL`, `USER_LIST`, `USER_SET_STATUS`, `USER_INFO`, `USER_GET_PRESENCE`, `REACTION_ADD`, `REACTION_REMOVE`, `REACTION_GET`, `FILE_UPLOAD`, `FILE_GET`, `FILE_DELETE`, `FILE_LIST`, `FILE_INFO`, `CONVERSATION_OPEN`

## 5.8 MSG91 operations (14)

`SEND_SMS`, `SEND_BULK_SMS`, `SEND_TRANSACTIONAL`, `SCHEDULE_SMS`, `SEND_OTP`, `VERIFY_OTP`, `RESEND_OTP`, `INVALIDATE_OTP`, `SEND_WHATSAPP`, `SEND_WHATSAPP_MEDIA`, `SEND_VOICE_OTP`, `SEND_EMAIL`, `GET_BALANCE`, `GET_REPORT`

## 5.9 HubSpot operations (35)

`CREATE_CONTACT`, `GET_CONTACT`, `UPDATE_CONTACT`, `DELETE_CONTACT`, `SEARCH_CONTACTS`, `GET_CONTACT_PROPERTIES`, `UPSERT_CONTACT`, `GET_CONTACT_ASSOCIATIONS`, `CREATE_COMPANY`, `GET_COMPANY`, `UPDATE_COMPANY`, `DELETE_COMPANY`, `SEARCH_COMPANIES`, `CREATE_DEAL`, `GET_DEAL`, `UPDATE_DEAL`, `DELETE_DEAL`, `SEARCH_DEALS`, `UPDATE_DEAL_STAGE`, `CREATE_TICKET`, `GET_TICKET`, `UPDATE_TICKET`, `DELETE_TICKET`, `SEARCH_TICKETS`, `CREATE_NOTE`, `CREATE_TASK`, `CREATE_CALL`, `CREATE_EMAIL_LOG`, `CREATE_ASSOCIATION`, `DELETE_ASSOCIATION`, `ADD_CONTACT_TO_LIST`, `REMOVE_CONTACT_FROM_LIST`, `GET_LIST_CONTACTS`, `SEARCH_OBJECTS`, `GET_PROPERTIES`

## 5.10 Shiprocket operations (23)

`CREATE_ORDER`, `GET_ORDER`, `CANCEL_ORDER`, `UPDATE_ORDER`, `GET_ORDER_TRACKING`, `CLONE_ORDER`, `GENERATE_AWB`, `GET_ORDERS_LIST`, `TRACK_SHIPMENT`, `ASSIGN_COURIER`, `GENERATE_LABEL`, `GENERATE_MANIFEST`, `REQUEST_PICKUP`, `GET_COURIER_LIST`, `GET_RATE`, `CHECK_SERVICEABILITY`, `CREATE_RETURN`, `GET_RETURN_REASONS`, `TRACK_RETURN`, `CREATE_PRODUCT`, `GET_PRODUCTS`, `GET_PICKUP_LOCATIONS`, `CREATE_PICKUP_LOCATION`

## 5.11 Zoho CRM operations (32)

`CREATE_LEAD`, `GET_LEAD`, `UPDATE_LEAD`, `DELETE_LEAD`, `SEARCH_LEADS`, `CONVERT_LEAD`, `CREATE_CONTACT`, `GET_CONTACT`, `UPDATE_CONTACT`, `DELETE_CONTACT`, `SEARCH_CONTACTS`, `GET_CONTACT_DEALS`, `CREATE_DEAL`, `GET_DEAL`, `UPDATE_DEAL`, `DELETE_DEAL`, `SEARCH_DEALS`, `UPDATE_DEAL_STAGE`, `CREATE_ACCOUNT`, `GET_ACCOUNT`, `UPDATE_ACCOUNT`, `DELETE_ACCOUNT`, `SEARCH_ACCOUNTS`, `CREATE_TASK`, `CREATE_CALL_LOG`, `CREATE_MEETING`, `GET_ACTIVITIES`, `ADD_NOTE`, `GET_NOTES`, `UPSERT_RECORD`, `SEARCH_RECORDS`, `GET_FIELDS`

## 5.12 Freshdesk operations (31)

`CREATE_TICKET`, `GET_TICKET`, `UPDATE_TICKET`, `DELETE_TICKET`, `LIST_TICKETS`, `SEARCH_TICKETS`, `GET_TICKET_FIELDS`, `RESTORE_TICKET`, `ADD_NOTE`, `LIST_NOTES`, `UPDATE_NOTE`, `DELETE_NOTE`, `CREATE_CONTACT`, `GET_CONTACT`, `UPDATE_CONTACT`, `DELETE_CONTACT`, `LIST_CONTACTS`, `SEARCH_CONTACTS`, `MERGE_CONTACT`, `CREATE_COMPANY`, `GET_COMPANY`, `UPDATE_COMPANY`, `DELETE_COMPANY`, `LIST_COMPANIES`, `LIST_AGENTS`, `GET_AGENT`, `UPDATE_AGENT`, `LIST_CONVERSATIONS`, `SEND_REPLY`, `CREATE_OUTBOUND_EMAIL`, `GET_TICKET_STATS`

---

## 6) Node-by-node specialties, limitations, and behavior

## 6.1 Trigger nodes

### INITIAL
- **Specialty:** bootstrap visual start node in editor UX.
- **Limitations:** not a rich external trigger; generally maps to manual-start semantics.

### MANUAL_TRIGGER
- **Specialty:** explicit user-driven execution from UI.
- **Limitations:** no native external event ingestion.

### SCHEDULE_TRIGGER
- **Specialty:** cron-like periodic execution.
- **Limitations:** schedule granularity and reliability depend on Inngest/runtime setup.

### WEBHOOK_TRIGGER
- **Specialty:** generic inbound HTTP entry point.
- **Limitations:** user must manage source auth/signature strategy if strict validation is needed.

### GOOGLE_FORM_TRIGGER
- **Specialty:** starts workflow from Google Form submissions.
- **Limitations:** dependent on Google integration constraints and credentials.

### STRIPE_TRIGGER
- **Specialty:** payment-event-based automation.
- **Limitations:** requires Stripe webhook/event setup consistency.

### RAZORPAY_TRIGGER
- **Specialty:** verified Razorpay webhook ingestion (HMAC path in webhook route).
- **Limitations:** webhook secret management and event subscription hygiene required.

### WHATSAPP_TRIGGER
- **Specialty:** Meta webhook verification + inbound WhatsApp event processing.
- **Limitations:** Meta account/app setup complexity; only receives, does not send.

### ERROR_TRIGGER
- **Specialty:** dedicated failure-handling subgraph for workflow resilience/alerting.
- **Limitations:** only activates on failed executions; design must avoid recursive failure loops.

## 6.2 Control/dataflow nodes

### IF_ELSE
- **Specialty:** conditional routing with operators and compound conditions JSON.
- **Limitations:** incorrect condition paths can silently route to unintended branch.

### SWITCH
- **Specialty:** multi-case routing (`casesJson`, branch outputs).
- **Limitations:** requires consistent output-handle wiring discipline.

### LOOP
- **Specialty:** iterates over context collections, executes downstream logic per item.
- **Limitations:** bounded by `maxIterations`; very large arrays can increase run time.

### MERGE
- **Specialty:** recombines branch outputs via 5 strategies (`combine`, `position`, `crossJoin`, `keyMatch`, `keyDiff`).
- **Limitations:** branch key mismatches or shape mismatches can produce sparse/empty joins.

### WAIT
- **Specialty:** pause/resume in `duration`, `until`, or `webhook` mode.
- **Limitations:** webhook resume and timeout behavior must be configured carefully.

### SET_VARIABLE
- **Specialty:** deterministic context enrichment through key/value pairs.
- **Limitations:** key collisions can overwrite prior values if naming is not disciplined.

### CODE
- **Specialty:** custom programmable transform/logic with timeout and output mode.
- **Limitations:** runtime safety/timeouts and user-authored code quality are risk points.

### SORT
- **Specialty:** reusable sorting utility (`SORT_ARRAY`, `SORT_KEYS`, `REVERSE`, `SHUFFLE`).
- **Limitations:** requires correct `inputPath` and sort key type assumptions.

## 6.3 Communication nodes

### GMAIL (18 ops)
- **Specialty:** send/read/draft/label/thread/attachment workflows in one node.
- **Limitations:** quota scopes and message/thread IDs must be valid.

### WHATSAPP (5 ops)
- **Specialty:** send text/template/media/reactions through WhatsApp API.
- **Limitations:** template approval + media constraints from Meta ecosystem.

### SLACK (34 ops)
- **Specialty:** broad Slack surface: messages/channels/users/reactions/files/conversation open.
- **Limitations:** token scopes must match selected op; legacy ops retained for compatibility.

### TELEGRAM
- **Specialty:** bot-driven messaging/integration.
- **Limitations:** constrained by Telegram bot API semantics and chat permissions.

### DISCORD
- **Specialty:** Discord messaging/automation use cases.
- **Limitations:** permission scopes and webhook/bot setup required.

### MSG91 (14 ops)
- **Specialty:** multi-channel (SMS/OTP/WhatsApp/Voice/Email) India-focused communications.
- **Limitations:** provider-specific templates/routes and rate limits.

## 6.4 Workspace/productivity nodes

### GOOGLE_SHEETS (10 ops)
- **Specialty:** row CRUD/search/range/sheet creation operations for tabular automation.
- **Limitations:** sheet/range schema drift can break mappings.

### GOOGLE_DRIVE (4 ops)
- **Specialty:** file upload/download/list + folder creation.
- **Limitations:** file IDs, mime types, and Drive permissions are common failure points.

### NOTION (11 ops)
- **Specialty:** databases/pages/blocks/search/users coverage.
- **Limitations:** strict Notion object schemas and property IDs.

### WORKDAY
- **Specialty:** HR/workday-specific integration path.
- **Limitations:** enterprise credentialing and API availability constraints.

## 6.5 Payments/commerce/logistics nodes

### RAZORPAY (28 ops)
- **Specialty:** orders/payments/refunds/subscriptions/invoices/payouts/signature verification.
- **Limitations:** payment semantics are strict; wrong state transitions fail quickly.

### SHIPROCKET (23 ops)
- **Specialty:** order-to-shipment-to-return-to-warehouse lifecycle coverage.
- **Limitations:** address/courier/serviceability data quality is critical.

## 6.6 CRM/support nodes

### ZOHO_CRM (32 ops)
- **Specialty:** leads/contacts/deals/accounts/activities/notes/upsert/search/field metadata.
- **Limitations:** module-field variations and API limits differ by account plan.

### HUBSPOT (35 ops)
- **Specialty:** broad CRM + activities + associations + list operations.
- **Limitations:** object schemas and custom property contracts must be respected.

### FRESHDESK (31 ops)
- **Specialty:** ticketing + contacts + companies + agents + conversations.
- **Limitations:** ticket/contact field validations and role permissions can block operations.

## 6.7 AI and utility nodes

### ANTHROPIC / OPENAI / GEMINI / GROQ / XAI / DEEPSEEK / PERPLEXITY (each uses 9 AIOperation modes)
- **Specialty:** one shared AI abstraction with provider-specific model backends.
- **Limitations:** model availability, token limits, and provider-specific output behavior vary.

### HTTP_REQUEST
- **Specialty:** generic API integration escape hatch.
- **Limitations:** caller is responsible for request/response contracts and error handling.

### X
- **Specialty:** social posting/integration flows.
- **Limitations:** platform API policy/rate limits can change quickly.

### MEDIA_UPLOAD (3 source modes)
- **Specialty:** normalized media ingestion (`URL`, `BASE64`, `GOOGLE_DRIVE`) for downstream tasks.
- **Limitations:** mime consistency, payload size, and source accessibility constraints.

---

## 7) How code flow works in detail (runtime internals)

## 7.1 Execution graph and levels

- Topological sorting ensures acyclic dependency-safe order.
- Levels allow parallelism where dependencies permit.
- Parallel outputs are merged with `mergeParallelResults`.

## 7.2 Branching and skipping

- IF/SWITCH set a branch marker in context.
- Engine computes non-taken outgoing edges and recursively marks downstream nodes skipped.
- This avoids accidental execution of unreachable branches.

## 7.3 Loop semantics

- Loop handles per-item downstream execution internally.
- Engine tracks `_executedByLoop` to avoid duplicate downstream execution in normal flow.

## 7.4 Observability

- Every node gets a `NodeExecution` snapshot (input, output, error, duration, order).
- JSON payload is truncated by a max length guard to keep storage bounded.
- Realtime channels stream status updates to UI.

## 7.5 Error pipeline

- Main executor `onFailure` marks execution failed.
- It emits `workflow/execute.error-triggered`.
- Error-triggered function finds `ErrorTriggerNode`s and runs downstream error handlers.

---

## 8) Practical limitations to account for when building a strong competitor

1. **Credential and scope complexity**  
   Multi-provider nodes (Slack/HubSpot/Freshdesk/etc.) require robust credential UX, scope checks, and health checks.

2. **Schema drift risk**  
   External API schemas evolve. Add compatibility layers, versioned adapters, and better payload validation.

3. **Branch/loop correctness at scale**  
   Complex workflows need strong graph diagnostics, dry-run simulation, and deterministic replay tooling.

4. **Operational observability depth**  
   Current snapshots are strong; competitor-grade systems also need searchable structured logs, traces, and replay diffing.

5. **Node discoverability**  
   Large operation surfaces (e.g., HubSpot 35 ops, Slack 34 ops) need excellent in-product docs and operation presets.

6. **Security hardening**  
   Webhook signatures, encrypted secrets migration completion, and secure code-node sandboxing should stay high priority.

---

## 9) Quick model mapping (which schema model stores which node config)

- Shared graph/run models: `Node`, `Connection`, `Execution`, `NodeExecution`
- Node config models:
  - `AINode`, `WebhookTrigger`, `ScheduleTrigger`, `IfElseNode`, `SwitchNode`,
  - `GmailNode`, `SetVariableNode`, `GoogleSheetsNode`, `GoogleDriveNode`,
  - `CodeNode`, `WhatsAppNode`, `LoopNode`, `NotionNode`, `RazorpayNode`,
  - `SlackNode`, `WaitNode`, `MergeNode`, `ErrorTriggerNode`,
  - `RazorpayTrigger`, `WhatsAppTrigger`, `Msg91Node`, `ShiprocketNode`,
  - `ZohoCrmNode`, `HubspotNode`, `FreshdeskNode`, `MediaUploadNode`, `SortNode`.

---

## 10) Final note

This repository already has a broad node surface and a durable execution core.  
If you want to out-compete n8n, focus next on:

- node quality and reliability (not only quantity),
- first-class debugging/replay,
- strong template marketplace,
- strict security defaults,
- and polished onboarding for non-technical users.
