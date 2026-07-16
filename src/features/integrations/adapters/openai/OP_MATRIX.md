# OpenAI operation matrix (Nodebase → Corsair)

Source: `@corsair-dev/openai` — **129 nested endpoints** (models, chat, embeddings, files, assistants, threads, messages, runs, vector stores, audio, images, videos, realtime, fine-tuning, batches, uploads, evals, …).

Registry is generated from the package tree (`OPENAI_CORSAIR_ENDPOINTS`).

Product aliases: `CHAT` → `chat.createCompletion`, `EMBED` → `embeddings.create`, `IMAGE` → `images.create`, `MODERATE`, `TTS`, `LIST_MODELS`, `COMPLETION`.

Generic invoker walks `client.openai.api.<group>.<leaf>(args)`. Convenience fields + `paramsJson` / `messagesJson` cover edge inputs. Dual-path: Corsair first for OPENAI nodes when plugin flag is on; falls back to shared `aiExecutor`.
