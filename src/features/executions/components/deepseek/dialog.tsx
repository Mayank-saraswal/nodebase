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

const DEEPSEEK_OPS = [
  "CHAT",
  "ANTHROPIC_MESSAGE",
  "GET_BALANCE",
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
  messagesJson: z.string().optional(),
  paramsJson: z.string().optional(),
  temperature: z.string().optional(),
  maxTokens: z.string().optional(),
})

export type DeepseekFormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: DeepseekFormValues) => void
  defaultValues?: Partial<DeepseekFormValues>
}

export const DeepseekDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const { data: credentials, isLoading } = useCredentialsByType(
    CredentialType.DEEPSEEK,
  )

  const form = useForm<DeepseekFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "deepseek",
      credentialId: defaultValues.credentialId || "",
      operation: defaultValues.operation || "CHAT",
      model: defaultValues.model || "deepseek-chat",
      systemPrompt: defaultValues.systemPrompt || "",
      userPrompt: defaultValues.userPrompt || "",
      messagesJson: defaultValues.messagesJson || "",
      paramsJson: defaultValues.paramsJson || "",
      temperature: defaultValues.temperature || "",
      maxTokens: defaultValues.maxTokens || "",
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      variableName: defaultValues.variableName || "deepseek",
      credentialId: defaultValues.credentialId || "",
      operation: defaultValues.operation || "CHAT",
      model: defaultValues.model || "deepseek-chat",
      systemPrompt: defaultValues.systemPrompt || "",
      userPrompt: defaultValues.userPrompt || "",
      messagesJson: defaultValues.messagesJson || "",
      paramsJson: defaultValues.paramsJson || "",
      temperature: defaultValues.temperature || "",
      maxTokens: defaultValues.maxTokens || "",
    })
  }, [open, defaultValues, form])

  const op = form.watch("operation") || "CHAT"
  const varName = form.watch("variableName") || "deepseek"
  const needsChat = op === "CHAT" || op === "ANTHROPIC_MESSAGE"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>DeepSeek Configuration</DialogTitle>
          <DialogDescription>
            Full @corsair-dev/deepseek surface: chat, Anthropic-compatible
            messages, balance, models. Corsair when enabled; else legacy path.
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
                      {DEEPSEEK_OPS.map((o) => (
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
            {needsChat && (
              <>
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <Select
                        value={field.value || "deepseek-chat"}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="deepseek-chat">
                            deepseek-chat
                          </SelectItem>
                          <SelectItem value="deepseek-reasoner">
                            deepseek-reasoner
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator />
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
                <FormField
                  control={form.control}
                  name="maxTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Max tokens
                        {op === "ANTHROPIC_MESSAGE" ? " (required-ish)" : ""}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            op === "ANTHROPIC_MESSAGE" ? "1024" : "optional"
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
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
