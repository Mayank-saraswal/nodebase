# Integrations (Corsair backbone)

This feature owns multi-tenant third-party integrations via the **self-hosted Corsair SDK**.

## Layout

```
adapters/<plugin>/   # Nodebase operation → Corsair API
server/              # tRPC connect / list / disconnect
webhooks/            # Future unified webhook bridge
connect/             # Optional UI helpers
```

## Rules

See root `AGENTS.md`. Never invent endpoints. Always `withTenant(resolveTenantId(...))`.
