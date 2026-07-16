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
  SelectItem,
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

const GEMINI_OPS = [
  "CHAT",
  "COUNT_TOKENS",
  "EMBED",
  "IMAGE",
  "GENERATE_VIDEO",
  "GET_VIDEO_OPERATION",
  "WAIT_VIDEO",
  "LIST_MODELS",
] as const

const formSchema = z.object({
  variableName: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_$]*$/),
  credentialId: z.string().optional(),
  operation: z.string().min(1),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().optional(),
  prompt: z.string().optional(),
  operationName: z.string().optional(),
  contentsJson: z.string().optional(),
  paramsJson: z.string().optional(),
  temperature: z.string().optional(),
  maxOutputTokens: z.string().optional(),
})

export type GeminiFormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: GeminiFormValues) => void
  defaultValues?: Partial<GeminiFormValues>
}

export const GeminiDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const { data: credentials, isLoading } = useCredentialsByType(
    CredentialType.GEMINI,
  )

  const form = useForm<GeminiFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "gemini",
      credentialId: defaultValues.credentialId || "",
      operation: defaultValues.operation || "CHAT",
      model: defaultValues.model || "gemini-2.0-flash",
      systemPrompt: defaultValues.systemPrompt || "",
      userPrompt: defaultValues.userPrompt || "",
      prompt: defaultValues.prompt || "",
      operationName: defaultValues.operationName || "",
      contentsJson: defaultValues.contentsJson || "",
      paramsJson: defaultValues.paramsJson || "",
      temperature: defaultValues.temperature || "",
      maxOutputTokens: defaultValues.maxOutputTokens || "",
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      variableName: defaultValues.variableName || "gemini",
      credentialId: defaultValues.credentialId || "",
      operation: defaultValues.operation || "CHAT",
      model: defaultValues.model || "gemini-2.0-flash",
      systemPrompt: defaultValues.systemPrompt || "",
      userPrompt: defaultValues.userPrompt || "",
      prompt: defaultValues.prompt || "",
      operationName: defaultValues.operationName || "",
      contentsJson: defaultValues.contentsJson || "",
      paramsJson: defaultValues.paramsJson || "",
      temperature: defaultValues.temperature || "",
      maxOutputTokens: defaultValues.maxOutputTokens || "",
    })
  }, [open, defaultValues, form])

  const op = form.watch("operation") || "CHAT"
  const varName = form.watch("variableName") || "gemini"
  const needsText = ["CHAT", "COUNT_TOKENS", "EMBED"].includes(op)
  const needsPrompt = ["IMAGE", "GENERATE_VIDEO"].includes(op)
  const needsOpName = ["GET_VIDEO_OPERATION", "WAIT_VIDEO"].includes(op)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gemini Configuration</DialogTitle>
          <DialogDescription>
            Full @corsair-dev/gemini surface (content, images, videos, models).
            Dual-path: Corsair when enabled, else legacy AI credential path.
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
                    <Input {...field} />
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
                    <SelectContent>
                      {GEMINI_OPS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o.replace(/_/g, " ")}
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
              name="credentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credential (legacy fallback)</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={isLoading ? "Loading…" : "Select"}
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
                    <Input placeholder="gemini-2.0-flash" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            {op === "CHAT" && (
              <FormField
                control={form.control}
                name="systemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System instruction</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-16" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {needsText && (
              <FormField
                control={form.control}
                name="userPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User prompt / text</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {needsPrompt && (
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prompt</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {needsOpName && (
              <FormField
                control={form.control}
                name="operationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video operation name</FormLabel>
                    <FormControl>
                      <Input placeholder="operations/…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="paramsJson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Params JSON (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      className="font-mono text-xs min-h-16"
                      placeholder="{}"
                      {...field}
                    />
                  </FormControl>
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
