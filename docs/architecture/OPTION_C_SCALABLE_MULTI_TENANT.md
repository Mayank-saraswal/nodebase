# Option C — Highly Scalable Multi-Tenant Architecture

**Status:** Adopted design direction for Nodebase  
**Date:** 2026-07-16  
**Scope:** Database design + workflow execution + integration catalog (Corsair backbone)  
**Decision:** **Option C** — Registry-driven operations; thin DB; Corsair owns provider API surface

---

## 1. Research summary

### 1.1 Problem we observed

| Symptom | Root cause |
|---------|------------|
| `enums.prisma` growing without bound (~800 lines) | Integration **operations** modeled as **Postgres enums** |
| Adding one Gmail/GitHub method needs schema churn | Op catalog coupled to Prisma migrations |
| Corsair already has typed endpoints per package | Second catalog (Prisma) duplicates npm packages |
| Multi-tenant isolation is only `userId` on workflow/credential | No explicit tenant model; hard to grow to orgs/workspaces |

### 1.2 How mature systems do this

#### n8n (workflow automation)

- **DB** stores **workflow graph JSON**: node type + parameters (including selected resource/operation as **data**).
- **Operations** live in **node packages** (declarative descriptions + execute functions), not as giant DB enums per provider.
- New ops = ship node package version. No `ALTER TYPE gmail_operation ADD VALUE` for every method.

#### Corsair (integration layer)

- **DB** = multi-tenant **connections / encrypted secrets / entity cache / events** (`corsair_*` tables).
- **Operations** = TypeScript endpoint trees in `@corsair-dev/*` packages + Zod.
- **Multi-tenancy** = `withTenant(tenantId)` on every call; no cross-tenant credential bleed.

#### Industry pattern (integration platforms)

```
Source of truth hierarchy (correct order):

1. Provider / SDK package (what is possible)     ← Corsair packages
2. Product registry (what we expose + UI)       ← Nodebase code
3. Workflow document (what this tenant configured) ← Postgres JSON
4. Execution records (what ran)                 ← Postgres append-only-ish logs
```

**Never invert:** do not make Postgres enum the source of truth for “all Gmail methods”.

### 1.3 What Nodebase does today (as-built)

| Piece | Current design |
|-------|----------------|
| Graph | `workflow` → `Node` + `Connection` |
| Node identity | `Node.type` = Prisma `NodeType` enum |
| Node config | `Node.data` JSON (includes `operation`, fields, often `credentialId`) |
| Ops catalog | Huge Prisma enums + mirrored TS enums (`GmailOperation`, `GitHubOperation`, …) |
| Credentials | `Credential` + Cryptr; scoped by `userId` |
| Execution | Inngest `executeWorkflow`: topo sort → levels → `getExecutor(NodeType)` → context bag |
| Tenancy | Implicit: `workflow.userId` = owner; no `tenantId` column |
| Corsair (new) | Parallel path: `corsair_*` tables + adapters; still dual with legacy enums |

### 1.4 Decision: Option C

| Option | Description | Verdict |
|--------|-------------|---------|
| A | Giant Prisma op enums per provider | **Reject** — not scalable |
| B | TS enums only, op string in JSON | Mid-term OK, incomplete |
| **C** | **Registry driven by Corsair; thin DB; multi-tenant first-class** | **Adopt** |

---

## 2. Design goals (non-negotiable)

1. **Scalable op catalog** — adding Slack/GitHub endpoints must not require DB migrations.
2. **Multi-tenant** — every run and every integration call is tenant-scoped; ready for workspace/org later.
3. **Corsair as integration backbone** — OAuth, tokens, typed APIs, rate/error handling live in Corsair; Nodebase does not re-implement them.
4. **Stable workflow engine** — keep durable Inngest execution, levels, branching, templates, realtime.
5. **Thin, evolvable DB** — schema growth tracks **product** features (tenants, billing, graph), not provider API surface area.
6. **Backward compatible migration** — existing workflows with `operation: "SEND"` keep working via aliases.

---

## 3. Conceptual model

```
┌──────────────────────────────────────────────────────────────────┐
│ TENANT (isolation boundary)                                      │
│  Phase A: tenantId = User.id                                     │
│  Phase B: tenantId = Workspace.id (users are members)            │
└────────────────────────────┬─────────────────────────────────────┘
                             │ owns
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   Workflows            Connections         Executions
   (graph)              (Corsair accounts)  (runs)
         │
         ▼
   Nodes: kind + typeKey + data(JSON)
         │
         │  at runtime
         ▼
   Registry.resolve(typeKey, operation)
         │
         ├─ platform node  → local executor (If/Else, Code, …)
         └─ integration    → corsair.withTenant(tenantId).plugin.api…
```

### 3.1 Node kinds

| Kind | Examples | Op source |
|------|----------|-----------|
| `platform` | IF_ELSE, LOOP, CODE, HTTP_REQUEST, WAIT | Nodebase-owned registry (fixed product set) |
| `integration` | GMAIL, SLACK, GOOGLE_SHEETS, … | **Corsair package** + Nodebase UI metadata |
| `trigger` | MANUAL, WEBHOOK, SCHEDULE, … | Nodebase (+ Corsair webhooks where used) |

---

## 4. Target database design

### 4.1 Principles

| Do store in Postgres | Do **not** store in Postgres |
|----------------------|------------------------------|
| Tenants / membership (when workspaces exist) | List of Gmail/Slack/GitHub methods |
| Workflow graph (nodes, edges) | Zod field schemas for each op |
| Node config as JSON | Provider OpenAPI trees |
| Execution + per-node run logs | Corsair endpoint TypeScript types |
| Corsair account/entity tables (as SDK requires) | Duplicate Credential blobs forever (migrate away) |
| Billing / quotas | — |

### 4.2 Target core schema (logical)

> Prisma is one implementation of this logical model. Types shown as TypeScript-ish for clarity.

#### Tenant (Phase B ready; Phase A can virtualize)

```prisma
// Phase A: no Workspace table required — tenantId := user.id
// Phase B:

model Workspace {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members   WorkspaceMember[]
  workflows workflow[]
  // optional: billing owner, plan overrides

  @@map("workspace")
}

model WorkspaceMember {
  id          String @id @default(cuid())
  workspaceId String
  userId      String
  role        String // owner | admin | member

  workspace Workspace @relation(...)
  user      User      @relation(...)

  @@unique([workspaceId, userId])
  @@index([userId])
  @@map("workspace_member")
}
```

#### Workflow (tenant-scoped)

```prisma
model workflow {
  id          String   @id @default(cuid())
  name        String
  /// Isolation key used everywhere (User.id now, Workspace.id later)
  tenantId    String   @map("tenant_id")
  /// Optional convenience: which user created it
  createdById String?  @map("created_by_id")

  version     Int      @default(1)  // optimistic concurrency / publish later
  status      String   @default("active") // draft | active | archived

  nodes       Node[]
  connections Connection[]
  executions  Execution[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tenantId, updatedAt])
  @@map("workflow")
}
```

**Migration note:** today `userId` exists. Map:

- `tenantId` ← `userId` (backfill)
- keep `userId` as `createdById` or dual-write until cutover

#### Node (no op enums)

```prisma
model Node {
  id         String @id @default(cuid())
  workflowId String

  /// Stable product key: "gmail" | "slack" | "if_else" | …
  /// Prefer String over giant NodeType enum long-term; short-term keep NodeType enum only for kinds we own.
  typeKey    String  @map("type_key")  // e.g. gmail, google_sheets, if_else

  kind       String  @default("integration") // platform | integration | trigger

  name       String
  position   Json

  /// Config document — see §5. Canonical shape
  data       Json    @default("{}")

  /// Optional denormalized for indexes/search (not source of truth)
  operation  String? // e.g. "messages.send" or alias "SEND"

  /// Prefer Corsair account id; legacy credentialId during migration
  connectionRef String? @map("connection_ref")

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  workflow   workflow @relation(...)
  // DROP Prisma FK dependency on Credential long-term

  @@index([workflowId])
  @@index([typeKey])
  @@index([operation])
  @@map("node")
}
```

#### Connection (edges)

Keep as today; ports remain strings (`fromOutput` / `toInput`) for branching.

```prisma
model Connection {
  id         String @id @default(cuid())
  workflowId String
  fromNodeId String
  toNodeId   String
  fromOutput String @default("main")
  toInput    String @default("main")

  @@unique([fromNodeId, toNodeId, fromOutput, toInput])
  @@index([workflowId])
}
```

#### Execution (tenant-aware, queryable)

```prisma
model Execution {
  id             String   @id @default(cuid())
  workflowId     String
  tenantId       String   @map("tenant_id")

  status         String   // RUNNING | SUCCESS | FAILED | CANCELLED (string or small enum)
  triggerType    String?  // manual | webhook | schedule | …
  inngestEventId String   @unique

  startedAt      DateTime @default(now())
  completedAt    DateTime?

  /// Final context snapshot (bounded / truncated)
  output         Json?
  error          String?  @db.Text
  errorStack     String?  @db.Text

  /// Optional metrics
  nodeCount      Int      @default(0)
  durationMs     Int?

  nodeExecutions NodeExecution[]

  @@index([tenantId, startedAt])
  @@index([workflowId, startedAt])
  @@index([status, startedAt])
  @@map("execution")
}

model NodeExecution {
  id           String @id @default(cuid())
  executionId  String
  tenantId     String @map("tenant_id")

  nodeId       String
  nodeName     String @default("")
  nodeType     String @default("")   // typeKey
  operation    String @default("")   // string path or alias — NOT FK to enum table

  status       String @default("success")
  inputJson    String @default("") @db.Text
  outputJson   String @default("") @db.Text
  errorMessage String @default("")
  durationMs   Int    @default(0)
  executionOrder Int  @default(0)

  createdAt    DateTime @default(now())

  @@index([executionId, executionOrder])
  @@index([tenantId, createdAt])
  @@index([nodeType, operation])
  @@map("node_execution")
}
```

#### Credentials / connections

| Path | Design |
|------|--------|
| **Target** | Corsair `corsair_accounts` with `tenant_id` = Nodebase `tenantId` |
| **Legacy** | `Credential` table remains until migration scripts finish |
| **Node link** | `data.connectionRef` or `connectionRef` column = Corsair account id |

Do **not** invent a third secrets system.

#### Corsair tables (unchanged contract)

Keep official Corsair schema (already in `corsair.prisma`):

- `corsair_integrations`
- `corsair_accounts` (**tenant_id**)
- `corsair_entities`
- `corsair_events`
- `corsair_permissions`

Nodebase **never** adds “op list” tables for providers.

### 4.3 What to **remove** from DB over time

| Remove / stop growing | Replacement |
|----------------------|-------------|
| `GmailOperation`, `GoogleSheetsOp`, `GitHubOperation`, … Prisma enums | Registry + Corsair packages |
| Most of `enums.prisma` op/credential explosion | Strings + Zod |
| Per-provider trigger secret models long-term (optional consolidation) | Corsair webhooks + thin routing table |

| Keep small | Why |
|------------|-----|
| `ExecutionStatus` (or free string with check) | Product lifecycle |
| Optional `NodeType` short-term | Gradual migration; long-term `typeKey` string + registry |

### 4.4 Indexes for scale

| Query | Index |
|-------|--------|
| Tenant’s workflows list | `(tenant_id, updated_at)` |
| Tenant’s executions | `(tenant_id, started_at)` |
| Workflow run history | `(workflow_id, started_at)` |
| Debug by op | `(node_type, operation)` on node_execution |
| Corsair accounts by tenant | already `(tenant_id, integration_id)` |

### 4.5 Multi-tenant rules (DB + app)

1. **Every row that is tenant data** carries `tenant_id` (or is reachable only via tenant-owned parent with cascade).
2. **All tRPC mutations** set `tenantId = resolveTenantId(session)`.
3. **All Inngest runs** stamp `Execution.tenantId` from workflow; never trust event payload alone for tenancy.
4. **Corsair:** only `corsair.withTenant(execution.tenantId)`.
5. **Webhooks:** resolve workflow → tenantId → then Corsair / execute.

---

## 5. Canonical node data document (JSON)

Stored in `Node.data` (and optionally denormalized `operation` column):

```ts
type NodeDataV1 = {
  /** Schema version for migrations of data shape */
  schemaVersion: 1

  /** Product alias or Corsair path, e.g. "SEND" | "messages.send" */
  operation: string

  /** Resolved at runtime via registry; optional override */
  variableName?: string

  /** Corsair account id for this tenant (preferred) */
  connectionRef?: string

  /** Legacy Cryptr credential id (migration only) */
  credentialId?: string

  /** Operation-specific parameters (validated by registry Zod) */
  params: Record<string, unknown>

  /** UI-only hints (optional) */
  ui?: { collapsed?: boolean }
}
```

**Compatibility:** readers accept legacy flat data (`to`, `subject` at top level) and normalize to `params` in adapter layer.

---

## 6. Operation registry (Option C core)

### 6.1 Location

```
src/features/integrations/
  registry/
    types.ts                 # OperationDefinition, IntegrationDefinition
    index.ts                 # getIntegration, listOperations, resolveExecutor
    platform/                # if_else, code, http_request, …
    integrations/
      gmail/
        definition.ts        # plugin id, corsair package id
        operations.ts        # map of op key → definition
        aliases.ts           # SEND → messages.send
        forms.ts             # optional UI field metadata
      google_sheets/
      google_drive/
      …
```

### 6.2 Operation definition (code, not DB)

```ts
type OperationDefinition = {
  /** Stable key stored in workflows — prefer Corsair path */
  key: string                    // "messages.send"
  /** Legacy aliases for old workflows */
  aliases?: string[]             // ["SEND"]
  label: string
  group?: string                 // "Send & Draft"
  description?: string
  /** Zod or JSON-schema for params */
  inputSchema: ZodType
  /** Optional output shape docs for AI / docs site */
  outputHints?: string[]
  risk?: "read" | "write" | "destructive"
  /** How to run */
  execute: (ctx: ExecuteContext) => Promise<Record<string, unknown>>
  enabled?: boolean              // hide experimental
}
```

### 6.3 Completeness rule (product law)

> For every `@corsair-dev/*` plugin we ship, **registry operations ⊇ Corsair public API endpoints**  
> (minus explicitly disabled ops).  
> Verified by unit test: `expect(registryKeys.sort()).toEqual(corsairEndpointKeys.sort())`.

UI may group/hide; **engine must not invent missing ops**.

### 6.4 Source of truth

| Item | Owner |
|------|--------|
| Endpoint existence + types | Corsair npm package |
| Labels, groups, forms, aliases | Nodebase registry |
| User’s chosen op + params | Workflow `Node.data` |
| Auth | Corsair accounts + `withTenant` |

Optional **codegen**:

```bash
pnpm generate:integration-registry
# reads node_modules/@corsair-dev/*/dist → stubs operations.ts
```

Humans only edit labels/aliases/enable flags.

---

## 7. Target workflow execution design

### 7.1 Keep (do not replace)

| Component | Role |
|-----------|------|
| Inngest | Durable steps, retries, concurrency per workflow |
| Topological sort + execution levels | Parallel independent nodes |
| Skip sets (If/Else, Switch) | Branching |
| Loop `executedByLoop` | Fan-out control |
| Handlebars `resolveTemplate` | Context interpolation |
| Realtime channels | Live node status in editor |
| Plan limits / execution gate | Billing |

### 7.2 Change (Option C)

| Today | Target |
|-------|--------|
| `getExecutor(NodeType)` only | `resolveHandler(typeKey, operation)` via registry |
| Per-provider mega switch in executor | Thin integration runner + op `execute` |
| `userId` only | `tenantId` + `userId` (actor) on every run |
| Op enums in Prisma | Op **string** + registry validation |
| Credential decrypt in every executor | `corsair.withTenant(tenantId)` (+ legacy bridge) |

### 7.3 Execution pipeline (target)

```
1. Event: workflow/execute.workflow
   data: { workflowId, initialData, tenantId? }

2. Load workflow by id
   assert tenantId matches workflow.tenantId
   create Execution { workflowId, tenantId, inngestEventId }

3. prepare-graph
   nodes + connections → topologicalSort → buildExecutionLevels

4. context = { ...initialData, __executionId, __tenantId }

5. for each level:
     parallel (or sequential if LOOP):
       a. resolve typeKey, kind, operation from node
       b. def = registry.resolve(typeKey, operation)  // aliases supported
       c. validate params with def.inputSchema (after template resolve)
       d. if kind === integration:
            client = corsair.withTenant(tenantId)
            output = def.execute({ client, params, context, step, publish })
          else:
            output = platformExecutor(def, ...)
       e. merge context[variableName] = output
       f. persist NodeExecution { tenantId, operation, ... }
       g. branch/loop bookkeeping (unchanged)

6. mark Execution SUCCESS | FAILED
```

### 7.4 Integration execute context

```ts
type ExecuteContext = {
  tenantId: string
  userId: string          // actor (may equal tenant in Phase A)
  nodeId: string
  operation: string       // canonical key after alias resolve
  params: Record<string, unknown>
  context: WorkflowContext
  client: CorsairTenantClient  // only for integration kind
  step: StepTools
  publish: Realtime.PublishFn
}
```

### 7.5 Generic integration runner (replaces N mega-executors long-term)

```ts
async function runIntegrationNode(params: NodeExecutorParams) {
  const typeKey = mapNodeTypeToKey(params) // GMAIL → gmail
  const operation = resolveOperationString(params.data)
  const def = registry.require(typeKey, operation)

  const tenantId = resolveTenantId({ userId: params.userId /*, workspaceId */ })
  const client = getCorsair().withTenant(tenantId)

  const paramsResolved = resolveAllTemplates(def.inputSchema, params.data, params.context)
  const parsed = def.inputSchema.parse(paramsResolved)

  return def.execute({
    tenantId,
    userId: params.userId,
    nodeId: params.nodeId,
    operation: def.key,
    params: parsed,
    context: params.context,
    client,
    step: params.step,
    publish: params.publish,
  })
}
```

Short-term: keep `gmailExecutor` / `googleSheetsExecutor` as wrappers calling registry (already dual-path pattern).  
Long-term: one `integrationExecutor` registered for all integration `NodeType`s.

### 7.6 Error & edge-case policy

| Case | Behavior |
|------|----------|
| Unknown operation string | `NonRetriableError` + list allowed keys for type |
| Zod validation fail | `NonRetriableError` with field paths |
| Corsair 401 | NonRetriable — reconnect connection |
| 429 / 5xx | `RetryAfterError` (Inngest) |
| Missing connection for tenant | NonRetriable — connect integration |
| Cross-tenant workflowId in event | Reject before run |
| Disabled registry op | NonRetriable — op not available |
| Template resolves empty required field | NonRetriable with template hint |
| Parallel level partial failure | Fail level (current behavior) unless continueOnFail later |

### 7.7 Scalability of the engine itself

| Concern | Design |
|---------|--------|
| Many nodes | Levels already parallelize independent nodes |
| Long runs | Inngest steps per node (or per level) — keep |
| Large payloads | Truncate NodeExecution JSON (existing MAX_JSON_LENGTH) |
| Hot workflows | concurrency key `workflowId` (existing) |
| Multi-tenant fair use | Optional future: concurrency key `tenantId` or quotas per tenant |
| Registry size | O(plugins × ops) in memory — fine at thousands of ops; lazy import per plugin |
| Cold start | Dynamic `import()` per integration package |

---

## 8. Multi-tenant architecture (end-to-end)

### Phase A (now — implement without Workspace table)

```
tenantId = User.id
workflow.userId → treat as tenantId (backfill column tenant_id = user_id)
corsair.withTenant(userId)
Execution.tenantId = workflow.tenantId
```

### Phase B (later — orgs)

```
Workspace
  └── WorkspaceMember (userId, role)
  └── workflow.tenantId = workspace.id
  └── corsair.withTenant(workspace.id)
```

**Critical:** introduce `resolveTenantId()` once and use it everywhere (already started in `src/lib/corsair/tenant.ts`).

### Isolation checklist

- [ ] No query by id without tenant predicate (or join to tenant-owned parent)
- [ ] Webhooks cannot start another tenant’s workflow without secret + ownership
- [ ] Connect links always pass session tenant
- [ ] Disconnect refuses foreign accountId
- [ ] AI agent generation cannot inject another tenant’s connectionRef

---

## 9. Folder structure (target)

```
src/lib/corsair/                    # SDK singleton, tenant, flags (exists)
src/features/integrations/
  registry/                         # Option C catalog
    types.ts
    index.ts
    assert-complete.ts              # test helper vs Corsair endpoints
  adapters/                         # execute implementations (exists; evolve)
    gmail/
    google-sheets/
    google-drive/
  server/connect.router.ts          # multi-tenant connect APIs (exists)
prisma/schema/
  core.prisma                       # graph + executions (evolve)
  corsair.prisma                    # Corsair tables only (exists)
  enums.prisma                      # SHRINK — platform enums only
docs/architecture/
  OPTION_C_SCALABLE_MULTI_TENANT.md # this file
AGENTS.md                           # enforce Option C rules
```

---

## 10. Migration plan (ordered, low risk)

### M0 — Design freeze (this document)

- Adopt Option C; update `AGENTS.md` with “no new Prisma op enums”.

### M1 — Tenant column without behavior change

- Add `workflow.tenant_id` (backfill from `user_id`).
- Add `execution.tenant_id` (backfill via workflow).
- App continues using `userId`; dual-write `tenantId`.

### M2 — Registry for Gmail + Sheets (already partially done)

- Move ops to registry keys; support aliases (`SEND` → `messages.send`).
- Store either form in `Node.data.operation`.
- **Do not** add new ops to Prisma enums (even if expanding product surface).

### M3 — Normalize `Node.data` to `schemaVersion: 1` + `params`

- Lazy migrate on read/save.
- Denormalize `operation` column for analytics.

### M4 — Generic integration executor

- Collapse per-file mega switches into registry `execute`.
- Keep dual-path flags until parity tests green.

### M5 — Drop integration op enums from Prisma

- Remove unused enums after no code imports generated Prisma op enums.
- Shrink `enums.prisma` to platform-only.

### M6 — Workspace multi-tenant (optional product milestone)

- Introduce Workspace + members; migrate selected tenants.

### M7 — Credential deprecation

- All integrations on Corsair accounts; retire Cryptr `Credential` for migrated types.

---

## 11. Testing strategy (scalable)

| Test | Purpose |
|------|---------|
| **Completeness** | Every Corsair endpoint key ∈ registry for that plugin |
| **Alias** | Legacy op names still resolve |
| **Zod** | Invalid params rejected without calling provider |
| **Tenant** | withTenant id = workflow.tenantId; disconnect foreign fails |
| **Engine** | Levels / branch / loop regression (platform nodes) |
| **Execution log** | operation string + truncated I/O persisted |
| **Flag** | Corsair off → legacy path (until M7) |

---

## 12. Comparison: before vs after Option C

| Dimension | Before | After Option C |
|-----------|--------|----------------|
| Add Gmail method | Prisma enum + TS enum + dialog + executor | Registry op (+ form) + Corsair already has API |
| DB migrations for ops | Frequent | Rare |
| Multi-tenant | Implicit userId | Explicit tenantId everywhere |
| Op source of truth | Split / duplicated | Corsair + registry |
| Engine | Per-type giant switches | Registry resolve + thin runner |
| Scale to 50 integrations | enums.prisma collapses | Linear registry files |

---

## 13. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Breaking old workflows | Alias map forever or until bulk rewrite |
| Registry drift from Corsair | Completeness tests in CI |
| Stringly-typed ops | Canonical keys + Zod; lint unknown ops |
| Premature Workspace complexity | Phase A virtual tenant = user.id |
| Double credential systems | Time-box dual-run; migrate scripts |
| Over-generic engine bugs | Keep platform nodes separate; solid unit tests |

---

## 14. Implementation priorities (next engineering work)

1. **AGENTS.md** — lock Option C (no new Prisma op enums; full Corsair surface via registry).  
2. **M1** — `tenant_id` columns + backfill.  
3. **Registry package structure** — Gmail/Sheets ops as registry entries with aliases.  
4. **Generic integration runner** behind flag.  
5. **Drive / Slack / …** — each plugin: completeness test first, then execute + UI forms.  
6. **M5** — delete dead op enums from Prisma.

---

## 15. Success criteria

- [ ] Zero new integration operations added to `enums.prisma`
- [ ] Every shipped Corsair plugin has completeness test green
- [ ] Every execution row has `tenant_id`
- [ ] Every Corsair call uses `withTenant(tenantId)`
- [ ] Adding a new Corsair endpoint does not require a DB migration
- [ ] Workflow engine still supports parallel levels, branch, loop, templates, realtime
- [ ] Multi-tenant isolation verified by automated tests

---

## 16. One-page mental model

```
DB = who + what graph + what ran + tenant boundaries
Registry = what ops mean in our product
Corsair = how we safely talk to the outside world
Inngest = how we run reliably
```

**Option C** keeps each layer doing one job — that is what makes Nodebase **highly scalable** and **multi-tenant** without drowning in enums.

---

## Document history

| Version | Change |
|---------|--------|
| 1.0 | Initial Option C adoption: research, DB design, execution design, migration plan |
| 1.1 | **M1 landed:** `tenant_id` on workflow/Execution/NodeExecution + backfill; registry foundation (`src/features/integrations/registry/*`); execution stamps tenant + operation string; workflows create/update dual-write tenantId; no new Prisma op enums |
