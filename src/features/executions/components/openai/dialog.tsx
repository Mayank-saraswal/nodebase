"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Separator } from "@/components/ui/separator"

/** Common product ops + escape hatch for any Corsair path via paramsJson */
const OPENAI_OPS = [
  "CHAT",
  "EMBED",
  "IMAGE",
  "MODERATE",
  "TTS",
  "LIST_MODELS",
  "COMPLETION",
  "models.list",
  "models.retrieve",
  "files.list",
  "files.retrieve",
  "assistants.create",
  "assistants.list",
  "threads.create",
  "messages.create",
  "runs.create",
  "vectorStores.create",
  "vectorStores.list",
  "batches.list",
  "responses.create",
] as const

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[a-zA-Z_][a-zA-Z0-9_$]*$/),
  credentialId: z.string().optional(),
  operation: z.string().min(1),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().optional(),
  prompt: z.string().optional(),
  input: z.string().optional(),
  id: z.string().optional(),
  fileId: z.string().optional(),
  threadId: z.string().optional(),
  assistantId: z.string().optional(),
  messagesJson: z.string().optional(),
  paramsJson: z.string().optional(),
  temperature: z.string().optional(),
  maxTokens: z.string().optional(),
  voice: z.string().optional(),
  size: z.string().optional(),
})

export type OpenAiFormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: OpenAiFormValues) => void
  defaultValues?: Partial<OpenAiFormValues>
}

export const OpenAiDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const { data: credentials, isLoading: isLoadingCredentials } =
    useCredentialsByType(CredentialType.OPENAI)

  const form = useForm<OpenAiFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "openai",
      credentialId: defaultValues.credentialId || "",
      operation: defaultValues.operation || "CHAT",
      model: defaultValues.model || "gpt-4o-mini",
      systemPrompt: defaultValues.systemPrompt || "",
      userPrompt: defaultValues.userPrompt || "",
      prompt: defaultValues.prompt || "",
      input: defaultValues.input || "",
      id: defaultValues.id || "",
      fileId: defaultValues.fileId || "",
      threadId: defaultValues.threadId || "",
      assistantId: defaultValues.assistantId || "",
      messagesJson: defaultValues.messagesJson || "",
      paramsJson: defaultValues.paramsJson || "",
      temperature: defaultValues.temperature || "",
      maxTokens: defaultValues.maxTokens || "",
      voice: defaultValues.voice || "alloy",
      size: defaultValues.size || "",
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      variableName: defaultValues.variableName || "openai",
      credentialId: defaultValues.credentialId || "",
      operation: defaultValues.operation || "CHAT",
      model: defaultValues.model || "gpt-4o-mini",
      systemPrompt: defaultValues.systemPrompt || "",
      userPrompt: defaultValues.userPrompt || "",
      prompt: defaultValues.prompt || "",
      input: defaultValues.input || "",
      id: defaultValues.id || "",
      fileId: defaultValues.fileId || "",
      threadId: defaultValues.threadId || "",
      assistantId: defaultValues.assistantId || "",
      messagesJson: defaultValues.messagesJson || "",
      paramsJson: defaultValues.paramsJson || "",
      temperature: defaultValues.temperature || "",
      maxTokens: defaultValues.maxTokens || "",
      voice: defaultValues.voice || "alloy",
      size: defaultValues.size || "",
    })
  }, [open, defaultValues, form])

  const op = form.watch("operation") || "CHAT"
  const varName = form.watch("variableName") || "openai"

  const isChat = op === "CHAT" || op === "chat.createCompletion"
  const isEmbed = op === "EMBED" || op === "embeddings.create"
  const isImage = op === "IMAGE" || op === "images.create"
  const isTts = op === "TTS" || op === "audio.createSpeech"
  const isModerate = op === "MODERATE" || op === "moderation.create"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>OpenAI Configuration</DialogTitle>
          <DialogDescription>
            Full Corsair surface (129 endpoints). Common ops listed; any path
            like <code>files.list</code> works via Operation + params JSON.
            Legacy credential path used when Corsair is off.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => {
              onSubmit(v)
              onOpenChange(false)
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="openai" {...field} />
                  </FormControl>
                  <FormDescription>{`Output: {{${varName}}}`}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operation</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      <SelectGroup>
                        <SelectLabel>Common</SelectLabel>
                        {OPENAI_OPS.slice(0, 7).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>More Corsair paths</SelectLabel>
                        {OPENAI_OPS.slice(7).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Or type any registry key in params via free-text after save
                    (node data.operation).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="credentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credential (legacy fallback)</FormLabel>
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            isLoadingCredentials
                              ? "Loading…"
                              : "Select credential"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(credentials ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input placeholder="gpt-4o-mini" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {isChat && (
              <>
                <FormField
                  control={form.control}
                  name="systemPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System prompt</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-16" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="userPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User prompt</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-24" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {(isEmbed || isModerate || isTts) && (
              <FormField
                control={form.control}
                name="input"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Input</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isImage && (
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image prompt</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isTts && (
              <FormField
                control={form.control}
                name="voice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voice</FormLabel>
                    <FormControl>
                      <Input placeholder="alloy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="messagesJson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Messages JSON (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      className="font-mono text-xs min-h-16"
                      placeholder='[{"role":"user","content":"…"}]'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paramsJson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Params JSON (any Corsair input)</FormLabel>
                  <FormControl>
                    <Textarea
                      className="font-mono text-xs min-h-16"
                      placeholder="{}"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Merged into the API call for advanced / unlisted fields.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
