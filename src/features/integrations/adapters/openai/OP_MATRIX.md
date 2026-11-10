# OpenAI operation matrix (Nodebase → Corsair)

Source: `@corsair-dev/openai` — **129 nested endpoints** (models, chat, embeddings, files, assistants, threads, messages, runs, vector stores, audio, images, videos, realtime, fine-tuning, batches, uploads, evals, …).

Registry is generated from the package tree (`OPENAI_CORSAIR_ENDPOINTS`).

Product aliases: `CHAT` → `chat.createCompletion`, `EMBED` → `embeddings.create`, `IMAGE` → `images.create`, `MODERATE`, `TTS`, `LIST_MODELS`, `COMPLETION`.

Generic invoker walks `client.openai.api.<group>.<leaf>(args)`. **All 129 package endpoints remain available** (no surface downgrade).

### Full chat potential
- `messagesJson`: roles `system|user|assistant|tool|function`
- `tool_calls` / `tool_call_id` preserved
- multimodal `content` arrays allowed
- `tools` / `tool_choice` / etc. via `paramsJson`

### Edges (workflow safety)
- missing prompt/messages, empty messages, bad JSON
- sampling ranges, **stream=true rejected**, missing client surface
- invalid roles / content types still rejected
