import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  isOpenAICorsairOp,
  runOpenAIOperation,
  type OpenAIApiClient,
  type ResolvedOpenAIFields,
} from "../operations"
import { OPENAI_CORSAIR_ENDPOINTS } from "@/features/integrations/registry/integrations/openai"

function fields(
  overrides: Partial<ResolvedOpenAIFields> = {},
): ResolvedOpenAIFields {
  return {
    operation: "CHAT",
    model: "gpt-4o-mini",
    prompt: "",
    systemPrompt: "",
    userPrompt: "hello",
    input: "",
    id: "",
    fileId: "",
    threadId: "",
    assistantId: "",
    runId: "",
    vectorStoreId: "",
    batchId: "",
    uploadId: "",
    conversationId: "",
    messagesJson: "",
    paramsJson: "",
    temperature: "",
    maxTokens: "",
    n: "",
    size: "",
    voice: "",
    instructions: "",
    ...overrides,
  }
}

/** Build nested mock covering every Corsair leaf endpoint */
function mockClient(): OpenAIApiClient {
  const leaf = () => vi.fn().mockResolvedValue({ ok: true, id: "x" })
  const tree: Record<string, unknown> = {}
  for (const key of OPENAI_CORSAIR_ENDPOINTS) {
    const [group, ...rest] = key.split(".")
    const leafName = rest.join(".")
    if (!tree[group]) tree[group] = {}
    ;(tree[group] as Record<string, unknown>)[leafName] = leaf()
  }
  // chat.createCompletion returns choices for text extraction
  ;(tree.chat as Record<string, unknown>).createCompletion = vi
    .fn()
    .mockResolvedValue({
      choices: [{ message: { content: "hi there" } }],
    })
  return { openai: { api: tree } }
}

describe("runOpenAIOperation (full Corsair surface + edges)", () => {
  let client: OpenAIApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("CHAT maps to chat.createCompletion", async () => {
    const out = await runOpenAIOperation(client, fields())
    expect(
      (client.openai.api.chat as Record<string, ReturnType<typeof vi.fn>>)
        .createCompletion,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "hello" }),
        ]),
      }),
    )
    expect(out.operation).toBe("CHAT")
    expect(out.text).toBe("hi there")
  })

  it("CHAT requires prompt", async () => {
    await expect(
      runOpenAIOperation(client, fields({ userPrompt: "", prompt: "" })),
    ).rejects.toThrow(/userPrompt|prompt|messagesJson/)
  })

  it("CHAT accepts messagesJson", async () => {
    await runOpenAIOperation(
      client,
      fields({
        userPrompt: "",
        messagesJson: JSON.stringify([
          { role: "user", content: "from json" },
        ]),
      }),
    )
    expect(
      (client.openai.api.chat as Record<string, ReturnType<typeof vi.fn>>)
        .createCompletion,
    ).toHaveBeenCalled()
  })

  it("invalid messagesJson", async () => {
    await expect(
      runOpenAIOperation(
        client,
        fields({ messagesJson: '{"not":"array"}' }),
      ),
    ).rejects.toThrow(/array/)
  })

  it("EMBED requires input", async () => {
    await expect(
      runOpenAIOperation(
        client,
        fields({ operation: "EMBED", userPrompt: "", prompt: "" }),
      ),
    ).rejects.toThrow(/input/)
  })

  it("EMBED", async () => {
    await runOpenAIOperation(
      client,
      fields({ operation: "EMBED", input: "hello world" }),
    )
    expect(
      (client.openai.api.embeddings as Record<string, ReturnType<typeof vi.fn>>)
        .create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ input: "hello world" }),
    )
  })

  it("IMAGE requires prompt", async () => {
    await expect(
      runOpenAIOperation(
        client,
        fields({ operation: "IMAGE", userPrompt: "", prompt: "" }),
      ),
    ).rejects.toThrow(/prompt/)
  })

  it("IMAGE + MODERATE + TTS edges", async () => {
    await runOpenAIOperation(
      client,
      fields({ operation: "IMAGE", prompt: "a cat" }),
    )
    await expect(
      runOpenAIOperation(
        client,
        fields({ operation: "MODERATE", userPrompt: "", prompt: "" }),
      ),
    ).rejects.toThrow(/input/)
    await runOpenAIOperation(
      client,
      fields({ operation: "MODERATE", input: "bad?" }),
    )
    await expect(
      runOpenAIOperation(
        client,
        fields({ operation: "TTS", userPrompt: "", prompt: "" }),
      ),
    ).rejects.toThrow(/input/)
    await runOpenAIOperation(
      client,
      fields({ operation: "TTS", input: "hello", voice: "alloy" }),
    )
    expect(
      (client.openai.api.images as Record<string, ReturnType<typeof vi.fn>>)
        .create,
    ).toHaveBeenCalled()
    expect(
      (client.openai.api.moderation as Record<string, ReturnType<typeof vi.fn>>)
        .create,
    ).toHaveBeenCalled()
    expect(
      (client.openai.api.audio as Record<string, ReturnType<typeof vi.fn>>)
        .createSpeech,
    ).toHaveBeenCalled()
  })

  it("id-required endpoints reject empty id", async () => {
    await expect(
      runOpenAIOperation(
        client,
        fields({ operation: "files.retrieve", fileId: "", id: "" }),
      ),
    ).rejects.toThrow(/fileId|id/)
  })

  it("files.retrieve with id", async () => {
    await runOpenAIOperation(
      client,
      fields({ operation: "files.retrieve", fileId: "file_1" }),
    )
    expect(
      (client.openai.api.files as Record<string, ReturnType<typeof vi.fn>>)
        .retrieve,
    ).toHaveBeenCalled()
  })

  it("covers ALL Corsair endpoint leaves via path keys", async () => {
    const skippedValidation = new Set([
      "chat.createCompletion", // needs prompt - tested separately
      "completions.create",
      "embeddings.create",
      "images.create",
      "moderation.create",
      "audio.createSpeech",
    ])
    const needId = new Set(
      OPENAI_CORSAIR_ENDPOINTS.filter(
        (k) =>
          k.includes("retrieve") ||
          k.includes("delete") ||
          k.includes("cancel") ||
          k.includes("modify") ||
          k.includes("update") ||
          k.includes("download") ||
          k.includes("get") ||
          k.endsWith(".search") ||
          k.includes("submitTool") ||
          k.includes("addPart") ||
          k.includes("complete") ||
          k.includes("listItems") ||
          k.includes("createItems") ||
          k.includes("getItem") ||
          k.includes("deleteItem") ||
          k.includes("listMessages") ||
          k.includes("listCheckpoints") ||
          k.includes("listEvents") ||
          k.includes("listFiles") ||
          k.includes("retrieveContent") ||
          k.includes("updateAttributes") ||
          k.includes("listOutput") ||
          k.includes("getOutput") ||
          k.includes("createAndRun") ||
          k.includes("createRemix") ||
          k.includes("listThread"),
      ),
    )

    let called = 0
    for (const key of OPENAI_CORSAIR_ENDPOINTS) {
      if (skippedValidation.has(key)) continue
      const f = fields({
        operation: key,
        userPrompt: "x",
        prompt: "x",
        input: "x",
        id: "id_1",
        fileId: "file_1",
        threadId: "th_1",
        assistantId: "as_1",
        runId: "run_1",
        vectorStoreId: "vs_1",
        batchId: "batch_1",
        uploadId: "up_1",
        conversationId: "conv_1",
        paramsJson: needId.has(key) ? '{"id":"id_1"}' : "{}",
      })
      await runOpenAIOperation(client, f)
      called++
    }
    // all endpoints minus the 6 special-cased ones we still call separately below
    expect(called).toBe(OPENAI_CORSAIR_ENDPOINTS.length - skippedValidation.size)

    // special cases
    await runOpenAIOperation(client, fields({ operation: "CHAT" }))
    await runOpenAIOperation(
      client,
      fields({ operation: "completions.create", prompt: "hi" }),
    )
    await runOpenAIOperation(
      client,
      fields({ operation: "EMBED", input: "e" }),
    )
    await runOpenAIOperation(
      client,
      fields({ operation: "IMAGE", prompt: "p" }),
    )
    await runOpenAIOperation(
      client,
      fields({ operation: "MODERATE", input: "i" }),
    )
    await runOpenAIOperation(
      client,
      fields({ operation: "TTS", input: "t" }),
    )
  })

  it("isOpenAICorsairOp covers registry + aliases", () => {
    expect(isOpenAICorsairOp("CHAT")).toBe(true)
    expect(isOpenAICorsairOp("chat.createCompletion")).toBe(true)
    expect(isOpenAICorsairOp("models.list")).toBe(true)
    expect(isOpenAICorsairOp("NOPE")).toBe(false)
  })

  it("invalid paramsJson", async () => {
    await expect(
      runOpenAIOperation(
        client,
        fields({ operation: "models.list", paramsJson: "[]" }),
      ),
    ).rejects.toThrow(/object/)
  })
})
