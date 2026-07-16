# AGENTS.md — Nodebase × Corsair

Read this file **before** any integration work. It overrides assumptions and prevents architecture drift.

## Product identity

| Layer | Role |
|-------|------|
| **Nodebase** | Visual workflow product: React Flow canvas, DAG execution (Inngest), templates, billing, AI workflow generation, realtime node status |
| **Corsair (self-hosted SDK)** | Integration backbone only: OAuth/API keys, multi-tenant credentials, typed provider APIs, webhook verify, rate/error handling |

Nodebase is **not** being replaced by Corsair Hub, Corsair “workflows” (TS hooks), or a rewrite of the execution engine.

## Hard rules (do not violate)

1. **Do not** remove or bypass React Flow, Inngest `executeWorkflow`, topological levels, If/Else skip sets, Loop handling, or `{{template}}` resolution.
2. **Do not** invent Corsair endpoints. Source of truth is:
   - Installed package types: `node_modules/@corsair-dev/<plugin>`
   - GitHub monorepo: `https://github.com/corsairdev/corsair/tree/main/packages`
   - **Not** marketing docs alone (docs lag the monorepo).
3. **Do not** call third-party APIs on the root Corsair client without tenancy. Always:
   ```ts
   const tenantId = resolveTenantId({ userId /*, workspaceId */ })
   const client = corsair.withTenant(tenantId)
   await client.<plugin>.api...
   ```
4. **Do not** enable Corsair Hub by default. Use **manual** (self-hosted) connect/OAuth surfaces.
5. **Do not** migrate flow-control or platform nodes to Corsair:  
   `IF_ELSE`, `SWITCH`, `LOOP`, `MERGE`, `WAIT`, `CODE`, `SORT`, `FILTER`, `AGGREGATE`, `SET_VARIABLE`, `HTTP_REQUEST`, `POSTGRES`, `MEDIA_UPLOAD`, `MANUAL_TRIGGER`, `SCHEDULE_TRIGGER`, `WEBHOOK_TRIGGER`, `ERROR_TRIGGER`, `INITIAL`.
6. **Do not** claim Corsair covers: WhatsApp, MSG91, Cashfree, Shiprocket, Zoho CRM, Freshdesk, Workday, Anthropic, xAI, Groq — keep native executors until packages exist.
7. **Keep** `NodeExecutor` signature (`data`, `nodeId`, `credentialId`, `context`, `step`, `publish`, `userId`, …). Only change executor **internals**.
8. **Keep** realtime via existing `src/inngest/channels/*` (`publish` loading/success/error). Do not invent a new realtime stack.
9. **Never log** access tokens, refresh tokens, API keys, or raw OAuth codes.
10. **Feature flags**: use `isCorsairEnabled()` + `isCorsairPluginEnabled('<id>')`. Legacy path must remain until a plugin is fully migrated and verified.

## Multi-tenancy

- **Phase A (current):** `tenantId === User.id` (workflow owner / session user).
- **Phase B (future):** `tenantId === workspaceId` via `resolveTenantId({ userId, workspaceId })`.
- Credentials/connections live in Corsair tables (`corsair_accounts.tenant_id`).
- Public webhooks: resolve `workflowId` → `workflow.userId` → tenant **before** any Corsair call.
- List/disconnect APIs must refuse foreign `accountId` / other tenants.

## Folder structure (required)

```
src/lib/corsair/                 # SDK singleton, tenant, flags, errors
src/features/integrations/       # adapters, connect router, webhooks bridge
  adapters/<plugin>/             # Nodebase op → Corsair API mapping
  server/connect.router.ts
prisma/schema/corsair.prisma     # table models (maps to Corsair SQL)
```

- Do **not** call `createCorsair` inside individual node executors.
- Do **not** import `@corsair-dev/*` outside `src/lib/corsair/client.ts` and adapters.

## Migration order

1. Base: DB tables, `createCorsair`, flags, connect tRPC, OAuth callback stubs  
2. **Gmail** full vertical (connect + all ops mapped or explicitly deferred + tests)  
3. Google Sheets → Google Drive  
4. Slack → GitHub → Notion → HubSpot  
5. Telegram → Discord → X (twitter)  
6. Razorpay → Stripe  
7. OpenAI → DeepSeek → Gemini → Perplexity  

**One plugin complete before the next.** Complete = op matrix documented, feature flag, unit tests, tenancy check, executor dual-path or cutover.

## Per-plugin definition of done

- [ ] Op matrix: Nodebase operation → Corsair endpoint (mapped | gap | deferred)
- [ ] Adapter under `src/features/integrations/adapters/<name>/`
- [ ] Executor uses flag + adapter; preserves realtime + `variableName` context
- [ ] Connect path tenant-scoped (OAuth or API key)
- [ ] Errors: 401 → NonRetriable reconnect; 429/5xx → RetryAfterError where appropriate
- [ ] No fake success for unmapped ops
- [ ] Cross-tenant access tests (or equivalent assertions)

## Dual credentials (transition)

- Legacy: Prisma `Credential` + Cryptr (`ENCRYPTION_KEY`)
- New: Corsair accounts + `CORSAIR_KEK` envelope encryption
- Until migration complete: flag-gated fallback to legacy is allowed
- Never mix tenant A’s legacy cred into tenant B’s Corsair client

## Gmail trigger note

Gmail **action** node migrates first via Corsair plugin.  
Gmail **Pub/Sub trigger** (`GmailWatcher`, `/api/webhooks/gmail`) may stay native until Corsair watch model is validated — document any decision in the Gmail adapter README.

## Overlap matrix (migrate only these)

| Nodebase | Corsair package |
|----------|-----------------|
| GMAIL | `@corsair-dev/gmail` |
| GOOGLE_SHEETS | `@corsair-dev/googlesheets` |
| GOOGLE_DRIVE | `@corsair-dev/googledrive` |
| SLACK | `@corsair-dev/slack` |
| GITHUB / GITHUB_TRIGGER | `@corsair-dev/github` |
| HUBSPOT | `@corsair-dev/hubspot` |
| NOTION | `@corsair-dev/notion` |
| TELEGRAM | `@corsair-dev/telegram` |
| DISCORD | `@corsair-dev/discord` |
| X | `@corsair-dev/twitter` |
| RAZORPAY / RAZORPAY_TRIGGER | `@corsair-dev/razorpay` |
| STRIPE_TRIGGER | `@corsair-dev/stripe` |
| OPENAI | `@corsair-dev/openai` |
| DEEPSEEK | `@corsair-dev/deepseek` |
| GEMINI | `@corsair-dev/gemini` |
| PERPLEXITY | `@corsair-dev/perplexityai` |

## Env

| Variable | Purpose |
|----------|---------|
| `CORSAIR_KEK` | Root encryption key (required when Corsair enabled) |
| `CORSAIR_ENABLED` | Master switch (`true`/`false`) |
| `CORSAIR_PLUGIN_GMAIL` | Per-plugin switch (etc.) |
| `DATABASE_URL` | Shared Postgres (Nodebase + Corsair tables) |
| `NEXT_PUBLIC_APP_URL` | Manual OAuth base URLs |

## When stuck

Prefer reading package types and existing Nodebase executor for that node over inventing APIs. If an op is missing in Corsair, mark deferred and keep legacy path — do not stub a broken call.
