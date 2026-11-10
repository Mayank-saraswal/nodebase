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
import { Switch } from "@/components/ui/switch"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Separator } from "@/components/ui/separator"

const DISCORD_OPS = [
  "SEND_MESSAGE",
  "REPLY_MESSAGE",
  "GET_MESSAGE",
  "LIST_MESSAGES",
  "EDIT_MESSAGE",
  "DELETE_MESSAGE",
  "CREATE_THREAD",
  "CREATE_THREAD_FROM_MESSAGE",
  "ADD_REACTION",
  "REMOVE_REACTION",
  "LIST_REACTIONS",
  "LIST_GUILDS",
  "GET_GUILD",
  "LIST_CHANNELS",
  "LIST_MEMBERS",
  "GET_MEMBER",
] as const

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[a-zA-Z_][a-zA-Z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and can only contain letters, numbers, and underscores",
    }),
  operation: z.string().min(1),
  /** Legacy inbound webhook (used when set; Corsair bot path when empty) */
  webhookUrl: z.string().optional(),
  channelId: z.string().optional(),
  messageId: z.string().optional(),
  content: z.string().optional(),
  username: z.string().optional(),
  guildId: z.string().optional(),
  userId: z.string().optional(),
  emoji: z.string().optional(),
  threadName: z.string().optional(),
  embedsJson: z.string().optional(),
  limit: z.string().optional(),
  autoArchiveDuration: z.string().optional(),
  tts: z.boolean().optional(),
})

export type DiscordFormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: DiscordFormValues) => void
  defaultValues?: Partial<DiscordFormValues>
}

export const DiscordDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<DiscordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "discord",
      operation: defaultValues.operation || "SEND_MESSAGE",
      webhookUrl: defaultValues.webhookUrl || "",
      channelId: defaultValues.channelId || "",
      messageId: defaultValues.messageId || "",
      content: defaultValues.content || "",
      username: defaultValues.username || "",
      guildId: defaultValues.guildId || "",
      userId: defaultValues.userId || "",
      emoji: defaultValues.emoji || "",
      threadName: defaultValues.threadName || "",
      embedsJson: defaultValues.embedsJson || "",
      limit: defaultValues.limit || "50",
      autoArchiveDuration: defaultValues.autoArchiveDuration || "",
      tts: defaultValues.tts ?? false,
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      variableName: defaultValues.variableName || "discord",
      operation: defaultValues.operation || "SEND_MESSAGE",
      webhookUrl: defaultValues.webhookUrl || "",
      channelId: defaultValues.channelId || "",
      messageId: defaultValues.messageId || "",
      content: defaultValues.content || "",
      username: defaultValues.username || "",
      guildId: defaultValues.guildId || "",
      userId: defaultValues.userId || "",
      emoji: defaultValues.emoji || "",
      threadName: defaultValues.threadName || "",
      embedsJson: defaultValues.embedsJson || "",
      limit: defaultValues.limit || "50",
      autoArchiveDuration: defaultValues.autoArchiveDuration || "",
      tts: defaultValues.tts ?? false,
    })
  }, [open, defaultValues, form])

  const op = form.watch("operation") || "SEND_MESSAGE"
  const varName = form.watch("variableName") || "discord"
  const webhookUrl = form.watch("webhookUrl") || ""

  const useLegacyWebhook = webhookUrl.trim().length > 0

  const needsChannel = [
    "SEND_MESSAGE",
    "REPLY_MESSAGE",
    "GET_MESSAGE",
    "LIST_MESSAGES",
    "EDIT_MESSAGE",
    "DELETE_MESSAGE",
    "CREATE_THREAD",
    "CREATE_THREAD_FROM_MESSAGE",
    "ADD_REACTION",
    "REMOVE_REACTION",
    "LIST_REACTIONS",
  ].includes(op)

  const needsMessage = [
    "REPLY_MESSAGE",
    "GET_MESSAGE",
    "EDIT_MESSAGE",
    "DELETE_MESSAGE",
    "CREATE_THREAD_FROM_MESSAGE",
    "ADD_REACTION",
    "REMOVE_REACTION",
    "LIST_REACTIONS",
  ].includes(op)

  const needsContent = [
    "SEND_MESSAGE",
    "REPLY_MESSAGE",
    "EDIT_MESSAGE",
  ].includes(op)

  const needsGuild = [
    "GET_GUILD",
    "LIST_CHANNELS",
    "LIST_MEMBERS",
    "GET_MEMBER",
  ].includes(op)

  const needsEmoji = [
    "ADD_REACTION",
    "REMOVE_REACTION",
    "LIST_REACTIONS",
  ].includes(op)

  const needsThreadName = [
    "CREATE_THREAD",
    "CREATE_THREAD_FROM_MESSAGE",
  ].includes(op)

  const handleSubmit = (values: DiscordFormValues) => {
    onSubmit(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Discord Configuration</DialogTitle>
          <DialogDescription>
            Bot API via Corsair when enabled (channel/guild ops). Or paste an
            inbound webhook URL for simple legacy posts.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="discord" {...field} />
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
                        <SelectLabel>Messages</SelectLabel>
                        {DISCORD_OPS.filter((o) =>
                          [
                            "SEND_MESSAGE",
                            "REPLY_MESSAGE",
                            "GET_MESSAGE",
                            "LIST_MESSAGES",
                            "EDIT_MESSAGE",
                            "DELETE_MESSAGE",
                          ].includes(o),
                        ).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Threads / Reactions</SelectLabel>
                        {DISCORD_OPS.filter(
                          (o) =>
                            o.includes("THREAD") || o.includes("REACTION"),
                        ).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Guild / Channel / Members</SelectLabel>
                        {DISCORD_OPS.filter(
                          (o) =>
                            o.includes("GUILD") ||
                            o.includes("CHANNEL") ||
                            o.includes("MEMBER"),
                        ).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="webhookUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook URL (legacy)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://discord.com/api/webhooks/…"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    If set, uses inbound webhook post instead of Corsair bot
                    API.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!useLegacyWebhook && needsChannel && (
              <FormField
                control={form.control}
                name="channelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel ID</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!useLegacyWebhook && needsMessage && (
              <FormField
                control={form.control}
                name="messageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message ID</FormLabel>
                    <FormControl>
                      <Input placeholder="message id" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(useLegacyWebhook || needsContent) && (
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Message text (templates OK)"
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Max 2000 characters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {useLegacyWebhook && (
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook username (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Bot name override" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!useLegacyWebhook && needsGuild && (
              <FormField
                control={form.control}
                name="guildId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guild / Server ID</FormLabel>
                    <FormControl>
                      <Input placeholder="guild id" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!useLegacyWebhook && op === "GET_MEMBER" && (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User ID</FormLabel>
                    <FormControl>
                      <Input placeholder="user id" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!useLegacyWebhook && needsEmoji && (
              <FormField
                control={form.control}
                name="emoji"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emoji</FormLabel>
                    <FormControl>
                      <Input placeholder="👍 or custom:name:id" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!useLegacyWebhook && needsThreadName && (
              <FormField
                control={form.control}
                name="threadName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thread name</FormLabel>
                    <FormControl>
                      <Input placeholder="thread title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!useLegacyWebhook && needsThreadName && (
              <FormField
                control={form.control}
                name="autoArchiveDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auto-archive (minutes)</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="60">60</SelectItem>
                        <SelectItem value="1440">1440 (1 day)</SelectItem>
                        <SelectItem value="4320">4320 (3 days)</SelectItem>
                        <SelectItem value="10080">10080 (1 week)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!useLegacyWebhook && needsContent && (
              <FormField
                control={form.control}
                name="embedsJson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Embeds JSON (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='[{"title":"Hello","description":"…"}]'
                        className="min-h-16 font-mono text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!useLegacyWebhook && op === "SEND_MESSAGE" && (
              <FormField
                control={form.control}
                name="tts"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>TTS</FormLabel>
                      <FormDescription>Text-to-speech message</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

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
