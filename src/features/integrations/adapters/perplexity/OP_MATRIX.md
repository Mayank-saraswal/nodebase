# Perplexity AI operation matrix (Nodebase → Corsair)

Source: [`@corsair-dev/perplexityai`](https://github.com/corsairdev/corsair/tree/main/packages/perplexityai)  
Plugin id: `perplexityai` · Product typeKey: `perplexity` · Auth: `api_key`

| Group | Corsair endpoints | Product aliases |
|-------|-------------------|-----------------|
| Chat | `chat.completions` | CHAT, CHAT_COMPLETION, GENERATE_TEXT, SEARCH_CHAT |

**Only public endpoint in package v0.1.0.** Completeness test asserts registry ⊇ `chat.completions`.

### Edge cases enforced
- Missing userPrompt/prompt/messagesJson
- Empty messagesJson array
- Invalid message role/content types
- Invalid paramsJson / messagesJson shape
- temperature / top_p / max_tokens range checks
- `stream=true` rejected (workflow non-streaming path)

### Security
- Tenant isolation via `withTenant(tenantId)` in runner
- No free-form API paths; registry resolve only
- Secrets never in node data (Corsair key manager / tenant account)
