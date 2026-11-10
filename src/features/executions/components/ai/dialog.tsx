"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import type { AIProvider } from "@/generated/prisma"

// ── Provider metadata ─────────────────────────────────────────────────────────

const PROVIDER_CREDENTIAL_TYPE: Record<AIProvider, CredentialType> = {
  OPENAI: CredentialType.OPENAI,
  ANTHROPIC: CredentialType.ANTHROPIC,
  GEMINI: CredentialType.GEMINI,
  GROQ: CredentialType.GROQ,
  XAI: CredentialType.XAI,
  DEEPSEEK: CredentialType.DEEPSEEK,
  PERPLEXITY: CredentialType.PERPLEXITY,
}

const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  OPENAI: [
    "gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano",
    "gpt-4-turbo", "o1", "o1-mini", "o3-mini", "o4-mini", "gpt-3.5-turbo",
    "text-embedding-3-small", "text-embedding-3-large", "dall-e-3", "dall-e-2",
    "whisper-1",
  ],
  ANTHROPIC: [
    "claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5",
    "claude-3-7-sonnet-latest", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest",
  ],
  GEMINI: [
    "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash",
    "gemini-1.5-pro", "gemini-1.5-flash",
    "text-embedding-004", "imagen-3.0-generate-001",
  ],
  GROQ: [
    "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192",
    "mixtral-8x7b-32768", "gemma2-9b-it", "llama-3.3-70b-specdec",
    "deepseek-r1-distill-llama-70b", "whisper-large-v3",
  ],
  XAI: [
    "grok-3-beta", "grok-3-fast-beta", "grok-3-mini-beta",
    "grok-2-1212", "grok-2-vision-1212",
  ],
  DEEPSEEK: ["deepseek-chat", "deepseek-reasoner"],
  PERPLEXITY: [
    "sonar-pro", "sonar", "sonar-reasoning-pro", "sonar-reasoning",
    "sonar-deep-research", "r1-1776",
  ],
}

type AIOperation =
  | "CHAT" | "CHAT_WITH_HISTORY" | "STRUCTURED_OUTPUT" | "TOOL_USE"
  | "VISION" | "EMBED" | "TRANSCRIBE" | "GENERATE_IMAGE" | "CLASSIFY"

// Operations supported per provider
const PROVIDER_OPERATIONS: Record<AIProvider, AIOperation[]> = {
  OPENAI: ["CHAT", "CHAT_WITH_HISTORY", "STRUCTURED_OUTPUT", "TOOL_USE", "VISION", "EMBED", "TRANSCRIBE", "GENERATE_IMAGE", "CLASSIFY"],
  ANTHROPIC: ["CHAT", "CHAT_WITH_HISTORY", "STRUCTURED_OUTPUT", "TOOL_USE", "VISION", "CLASSIFY"],
  GEMINI: ["CHAT", "CHAT_WITH_HISTORY", "STRUCTURED_OUTPUT", "TOOL_USE", "VISION", "EMBED", "GENERATE_IMAGE", "CLASSIFY"],
  GROQ: ["CHAT", "CHAT_WITH_HISTORY", "STRUCTURED_OUTPUT", "TOOL_USE", "TRANSCRIBE", "CLASSIFY"],
  XAI: ["CHAT", "CHAT_WITH_HISTORY", "STRUCTURED_OUTPUT", "TOOL_USE", "VISION", "CLASSIFY"],
  DEEPSEEK: ["CHAT", "CHAT_WITH_HISTORY", "STRUCTURED_OUTPUT", "CLASSIFY"],
  PERPLEXITY: ["CHAT", "CHAT_WITH_HISTORY", "CLASSIFY"],
}

const OPERATION_LABELS: Record<AIOperation, string> = {
  CHAT: "Chat",
  CHAT_WITH_HISTORY: "Chat with History",
  STRUCTURED_OUTPUT: "Structured Output (JSON)",
  TOOL_USE: "Tool / Function Calling",
  VISION: "Vision (Image Analysis)",
  EMBED: "Generate Embeddings",
  TRANSCRIBE: "Audio Transcription",
  GENERATE_IMAGE: "Generate Image",
  CLASSIFY: "Text Classification",
}

const OUTPUT_HINTS: Record<AIOperation, string[]> = {
  CHAT: ["text", "aiResponse", "usage.promptTokens", "usage.totalTokens"],
  CHAT_WITH_HISTORY: ["text", "aiResponse", "history", "usage.totalTokens"],
  STRUCTURED_OUTPUT: ["json", "text", "usage.totalTokens"],
  TOOL_USE: ["toolCalls", "toolCalls.0.name", "toolCalls.0.arguments", "text"],
  VISION: ["text", "aiResponse"],
  EMBED: ["embedding", "embedding.0"],
  TRANSCRIBE: ["transcript"],
  GENERATE_IMAGE: ["imageUrls", "imageUrl"],
  CLASSIFY: ["label", "confidence"],
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface AIDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: Record<string, unknown>) => void
  defaultValues?: Record<string, unknown>
  nodeId?: string
  workflowId?: string
  provider: AIProvider
  displayName: string
}

export const AIDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
  provider,
  displayName,
}: AIDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const credentialType = PROVIDER_CREDENTIAL_TYPE[provider]
  const { data: credentials, isLoading: isLoadingCredentials } = useCredentialsByType(credentialType)

  const config = undefined as any;
const isLoading = false;

const supportedOps = PROVIDER_OPERATIONS[provider]
  const models = PROVIDER_MODELS[provider]

  // ── State ──────────────────────────────────────────────────────────────────
  const [variableName, setVariableName] = useState((defaultValues.variableName as string) || "ai")
  const [credentialId, setCredentialId] = useState((defaultValues.credentialId as string) || "")
  const [operation, setOperation] = useState<AIOperation>("CHAT")
  const [model, setModel] = useState(models[0] ?? "")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [userPrompt, setUserPrompt] = useState("")
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1000)
  const [topP, setTopP] = useState(1.0)
  const [frequencyPenalty, setFrequencyPenalty] = useState(0.0)
  const [presencePenalty, setPresencePenalty] = useState(0.0)
  const [responseFormat, setResponseFormat] = useState("text")
  const [jsonSchema, setJsonSchema] = useState("")
  const [toolsJson, setToolsJson] = useState("[]")
  const [toolChoice, setToolChoice] = useState("auto")
  const [imageUrl, setImageUrl] = useState("")
  const [imageDetail, setImageDetail] = useState("auto")
  const [historyKey, setHistoryKey] = useState("")
  const [maxHistory, setMaxHistory] = useState(10)
  const [embeddingInput, setEmbeddingInput] = useState("")
  const [audioUrl, setAudioUrl] = useState("")
  const [audioLanguage, setAudioLanguage] = useState("")
  const [transcriptionFormat, setTranscriptionFormat] = useState("text")
  const [imagePrompt, setImagePrompt] = useState("")
  const [imageSize, setImageSize] = useState("1024x1024")
  const [imageQuality, setImageQuality] = useState("standard")
  const [imageStyle, setImageStyle] = useState("vivid")
  const [imageCount, setImageCount] = useState(1)
  const [classifyLabels, setClassifyLabels] = useState("")
  const [classifyExamples, setClassifyExamples] = useState("[]")
  const [continueOnFail, setContinueOnFail] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  const applyConfig = (src: {
    variableName?: string; credentialId?: string | null; operation?: string; model?: string
    systemPrompt?: string; userPrompt?: string; temperature?: number; maxTokens?: number
    topP?: number; frequencyPenalty?: number; presencePenalty?: number
    responseFormat?: string; jsonSchema?: string; toolsJson?: string; toolChoice?: string
    imageUrl?: string; imageDetail?: string; historyKey?: string; maxHistory?: number
    embeddingInput?: string; audioUrl?: string; audioLanguage?: string
    transcriptionFormat?: string; imagePrompt?: string; imageSize?: string
    imageQuality?: string; imageStyle?: string; imageCount?: number
    classifyLabels?: string; classifyExamples?: string; continueOnFail?: boolean
  }) => {
    if (src.variableName !== undefined) setVariableName(src.variableName)
    if (src.credentialId !== undefined) setCredentialId(src.credentialId ?? "")
    if (src.operation !== undefined && supportedOps.includes(src.operation as AIOperation)) {
      setOperation(src.operation as AIOperation)
    }
    if (src.model !== undefined) setModel(src.model || models[0] || "")
    if (src.systemPrompt !== undefined) setSystemPrompt(src.systemPrompt)
    if (src.userPrompt !== undefined) setUserPrompt(src.userPrompt)
    if (src.temperature !== undefined) setTemperature(src.temperature)
    if (src.maxTokens !== undefined) setMaxTokens(src.maxTokens)
    if (src.topP !== undefined) setTopP(src.topP)
    if (src.frequencyPenalty !== undefined) setFrequencyPenalty(src.frequencyPenalty)
    if (src.presencePenalty !== undefined) setPresencePenalty(src.presencePenalty)
    if (src.responseFormat !== undefined) setResponseFormat(src.responseFormat)
    if (src.jsonSchema !== undefined) setJsonSchema(src.jsonSchema)
    if (src.toolsJson !== undefined) setToolsJson(src.toolsJson)
    if (src.toolChoice !== undefined) setToolChoice(src.toolChoice)
    if (src.imageUrl !== undefined) setImageUrl(src.imageUrl)
    if (src.imageDetail !== undefined) setImageDetail(src.imageDetail)
    if (src.historyKey !== undefined) setHistoryKey(src.historyKey)
    if (src.maxHistory !== undefined) setMaxHistory(src.maxHistory)
    if (src.embeddingInput !== undefined) setEmbeddingInput(src.embeddingInput)
    if (src.audioUrl !== undefined) setAudioUrl(src.audioUrl)
    if (src.audioLanguage !== undefined) setAudioLanguage(src.audioLanguage)
    if (src.transcriptionFormat !== undefined) setTranscriptionFormat(src.transcriptionFormat)
    if (src.imagePrompt !== undefined) setImagePrompt(src.imagePrompt)
    if (src.imageSize !== undefined) setImageSize(src.imageSize)
    if (src.imageQuality !== undefined) setImageQuality(src.imageQuality)
    if (src.imageStyle !== undefined) setImageStyle(src.imageStyle)
    if (src.imageCount !== undefined) setImageCount(src.imageCount)
    if (src.classifyLabels !== undefined) setClassifyLabels(src.classifyLabels)
    if (src.classifyExamples !== undefined) setClassifyExamples(src.classifyExamples)
    if (src.continueOnFail !== undefined) setContinueOnFail(src.continueOnFail)
  }

  // Pre-fill from DB config
  useEffect(() => {
    if (config) applyConfig(config)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  // Pre-fill from defaultValues when opening without DB config
  useEffect(() => {
    if (open && !config) applyConfig(defaultValues as Parameters<typeof applyConfig>[0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const isValid = !!credentialId && !!variableName

  const handleSave = () => {
    if (!isValid) return

    const values: Record<string, unknown> = {
      credentialId, variableName, operation, model,
      systemPrompt, userPrompt, temperature, maxTokens, topP,
      frequencyPenalty, presencePenalty, responseFormat, jsonSchema,
      toolsJson, toolChoice, imageUrl, imageDetail, historyKey, maxHistory,
      embeddingInput, audioUrl, audioLanguage, transcriptionFormat,
      imagePrompt, imageSize, imageQuality, imageStyle, imageCount,
      classifyLabels, classifyExamples, continueOnFail,
    }
    onSubmit(values)

    if (workflowId && nodeId) {
      upsertMutation.mutate({
        nodeId, workflowId, provider, credentialId,
        operation,
        variableName, model, systemPrompt, userPrompt,
        temperature, maxTokens, topP, frequencyPenalty, presencePenalty,
        responseFormat, jsonSchema, toolsJson, toolChoice,
        imageUrl, imageUrls: "[]", imageDetail, historyKey, maxHistory,
        embeddingInput, audioUrl, audioLanguage, transcriptionFormat,
        imagePrompt, imageSize, imageQuality, imageStyle, imageCount,
        classifyLabels, classifyExamples, continueOnFail,
      })
    }
  }

  const v = variableName || "ai"
  const outputHints = OUTPUT_HINTS[operation] ?? []
  const showPenalties = provider === "OPENAI" || provider === "GROQ" || provider === "XAI" || provider === "DEEPSEEK" || provider === "PERPLEXITY"
  const noTempOps: AIOperation[] = ["EMBED", "TRANSCRIBE", "GENERATE_IMAGE"]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{displayName} — AI Configuration</DialogTitle>
          <DialogDescription>
            Configure model, operation, and prompts for this AI node
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 mt-2">

            {/* 1. Variable Name */}
            <div className="space-y-2">
              <Label>Variable Name *</Label>
              <Input
                placeholder="ai"
                value={variableName}
                onChange={(e) => setVariableName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Reference results as {`{{${v}.text}}`}
              </p>
            </div>

            <Separator />

            {/* 2. Credential */}
            <div className="space-y-2">
              <Label>{displayName} Credential *</Label>
              <Select
                value={credentialId}
                onValueChange={setCredentialId}
                disabled={isLoadingCredentials || !credentials?.length}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select credential..." />
                </SelectTrigger>
                <SelectContent>
                  {credentials?.map((cred) => (
                    <SelectItem key={cred.id} value={cred.id}>
                      {cred.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!credentials?.length && !isLoadingCredentials && (
                <p className="text-xs text-muted-foreground">
                  No {displayName} credentials found. Add one in Settings → Credentials.
                </p>
              )}
              {!credentialId && <p className="text-xs text-destructive">Credential is required</p>}
            </div>

            <Separator />

            {/* 3. Operation */}
            <div className="space-y-2">
              <Label>Operation</Label>
              <Select value={operation} onValueChange={(v) => setOperation(v as AIOperation)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedOps.map((op) => (
                    <SelectItem key={op} value={op}>
                      {OPERATION_LABELS[op]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Model */}
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* 5. Prompts — only for chat operations */}
            {!["EMBED", "TRANSCRIBE", "GENERATE_IMAGE"].includes(operation) && (
              <>
                <div className="space-y-2">
                  <Label>System Prompt (optional)</Label>
                  <Textarea
                    className="min-h-[80px] font-mono text-sm"
                    placeholder="You are a helpful assistant"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {"Use {{variables}} or {{json variable}} for template values"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>User Prompt *</Label>
                  <Textarea
                    className="min-h-[120px] font-mono text-sm"
                    placeholder={`Summarize this: {{httpResponse.body}}`}
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {"Use {{variables}} or {{json variable}} for template values"}
                  </p>
                </div>
              </>
            )}

            {/* 6. Advanced Parameters */}
            {!noTempOps.includes(operation) && (
              <div className="border rounded-lg">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
                  onClick={() => setAdvancedOpen((v) => !v)}
                >
                  Advanced Parameters
                  {advancedOpen ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                </button>
                {advancedOpen && (
                  <div className="px-4 pb-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Temperature: {temperature}</Label>
                      <input
                        type="range" min={0} max={2} step={0.1}
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">0 = deterministic, 2 = creative</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Tokens</Label>
                      <Input
                        type="number" min={1} max={100000}
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value) || 1000)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Top P: {topP}</Label>
                      <input
                        type="range" min={0} max={1} step={0.05}
                        value={topP}
                        onChange={(e) => setTopP(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    {showPenalties && (
                      <>
                        <div className="space-y-2">
                          <Label>Frequency Penalty: {frequencyPenalty}</Label>
                          <input
                            type="range" min={-2} max={2} step={0.1}
                            value={frequencyPenalty}
                            onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Presence Penalty: {presencePenalty}</Label>
                          <input
                            type="range" min={-2} max={2} step={0.1}
                            value={presencePenalty}
                            onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 7. Operation-specific fields */}

            {/* STRUCTURED_OUTPUT */}
            {operation === "STRUCTURED_OUTPUT" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Response Format</Label>
                  <Select value={responseFormat} onValueChange={setResponseFormat}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json_object">JSON Object (auto)</SelectItem>
                      <SelectItem value="json_schema">JSON Schema (strict)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {responseFormat === "json_schema" && (
                  <div className="space-y-2">
                    <Label>JSON Schema</Label>
                    <Textarea
                      className="min-h-[120px] font-mono text-xs"
                      placeholder={`{\n  "type": "object",\n  "properties": {\n    "name": { "type": "string" }\n  },\n  "required": ["name"]\n}`}
                      value={jsonSchema}
                      onChange={(e) => setJsonSchema(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {/* TOOL_USE */}
            {operation === "TOOL_USE" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Tools (JSON Array)</Label>
                  <Textarea
                    className="min-h-[160px] font-mono text-xs"
                    placeholder={`[{"type":"function","function":{"name":"get_weather","description":"Get weather","parameters":{"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}}}]`}
                    value={toolsJson}
                    onChange={(e) => setToolsJson(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tool Choice</Label>
                  <Select value={toolChoice} onValueChange={setToolChoice}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="required">Required</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* VISION */}
            {operation === "VISION" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input
                    placeholder="https://... or {{httpResponse.imageUrl}}"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Single image. For multiple images, add URLs comma-separated.</p>
                </div>
                <div className="space-y-2">
                  <Label>Image Detail</Label>
                  <Select value={imageDetail} onValueChange={setImageDetail}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="low">Low (faster, cheaper)</SelectItem>
                      <SelectItem value="high">High (detailed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* CHAT_WITH_HISTORY */}
            {operation === "CHAT_WITH_HISTORY" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>History Variable Path</Label>
                  <Input
                    placeholder="ai.history"
                    value={historyKey}
                    onChange={(e) => setHistoryKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Dot-path to an array of {`{role, content}`} in context (e.g., {`ai.history`})
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Max History Turns</Label>
                  <Input
                    type="number" min={1} max={100}
                    value={maxHistory}
                    onChange={(e) => setMaxHistory(parseInt(e.target.value) || 10)}
                  />
                </div>
              </>
            )}

            {/* EMBED */}
            {operation === "EMBED" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Text to Embed</Label>
                  <Textarea
                    className="min-h-[80px] font-mono text-sm"
                    placeholder="{{document.content}}"
                    value={embeddingInput}
                    onChange={(e) => setEmbeddingInput(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* TRANSCRIBE */}
            {operation === "TRANSCRIBE" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Audio URL *</Label>
                  <Input
                    placeholder="https://example.com/audio.mp3"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Language (optional)</Label>
                  <Input
                    placeholder="en"
                    value={audioLanguage}
                    onChange={(e) => setAudioLanguage(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">ISO 639-1 code. Leave empty for auto-detect.</p>
                </div>
                <div className="space-y-2">
                  <Label>Output Format</Label>
                  <Select value={transcriptionFormat} onValueChange={setTranscriptionFormat}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Plain Text</SelectItem>
                      <SelectItem value="json">JSON (with timestamps)</SelectItem>
                      <SelectItem value="srt">SRT (subtitles)</SelectItem>
                      <SelectItem value="vtt">VTT (web subtitles)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* GENERATE_IMAGE */}
            {operation === "GENERATE_IMAGE" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Image Prompt *</Label>
                  <Textarea
                    className="min-h-[100px] font-mono text-sm"
                    placeholder="A futuristic city at sunset, highly detailed, 8K"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Size</Label>
                    <Select value={imageSize} onValueChange={setImageSize}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1024x1024">1024×1024</SelectItem>
                        <SelectItem value="1792x1024">1792×1024 (landscape)</SelectItem>
                        <SelectItem value="1024x1792">1024×1792 (portrait)</SelectItem>
                        <SelectItem value="512x512">512×512</SelectItem>
                        <SelectItem value="256x256">256×256</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Count</Label>
                    <Input
                      type="number" min={1} max={4}
                      value={imageCount}
                      onChange={(e) => setImageCount(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                {provider === "OPENAI" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quality</Label>
                      <Select value={imageQuality} onValueChange={setImageQuality}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="hd">HD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Style</Label>
                      <Select value={imageStyle} onValueChange={setImageStyle}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vivid">Vivid</SelectItem>
                          <SelectItem value="natural">Natural</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* CLASSIFY */}
            {operation === "CLASSIFY" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Labels (comma-separated) *</Label>
                  <Input
                    placeholder="positive, negative, neutral"
                    value={classifyLabels}
                    onChange={(e) => setClassifyLabels(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Few-Shot Examples (JSON)</Label>
                  <Textarea
                    className="min-h-[100px] font-mono text-xs"
                    placeholder={`[{"text":"Great product!","label":"positive"},{"text":"Terrible.","label":"negative"}]`}
                    value={classifyExamples}
                    onChange={(e) => setClassifyExamples(e.target.value)}
                  />
                </div>
              </>
            )}

            <Separator />

            {/* 8. Output hints */}
            {outputHints.length > 0 && (
              <div className="rounded-lg bg-muted/50 border p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Available output variables:</p>
                <div className="flex flex-wrap gap-1.5">
                  {outputHints.map((hint) => (
                    <code key={hint} className="text-[11px] bg-background border rounded px-1.5 py-0.5">
                      {`{{${v}.${hint}}}`}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* 9. Continue on Fail */}
            <div className="flex items-center gap-3">
              <Switch checked={continueOnFail} onCheckedChange={setContinueOnFail} />
              <Label>Continue on Fail</Label>
            </div>

            {/* 10. Save */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!isValid || upsertMutation.isPending}>
                {upsertMutation.isPending ? (
                  <Loader2Icon className="size-4 animate-spin mr-2" />
                ) : saved ? (
                  <CheckIcon className="size-4 mr-2" />
                ) : null}
                {saved ? "Saved!" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
