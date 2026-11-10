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

const TELEGRAM_OPS = [
  "SEND_MESSAGE",
  "EDIT_MESSAGE",
  "DELETE_MESSAGE",
  "PIN_MESSAGE",
  "UNPIN_MESSAGE",
  "SEND_PHOTO",
  "SEND_VIDEO",
  "SEND_AUDIO",
  "SEND_DOCUMENT",
  "SEND_STICKER",
  "SEND_ANIMATION",
  "SEND_LOCATION",
  "SEND_MEDIA_GROUP",
  "SEND_CHAT_ACTION",
  "GET_CHAT",
  "GET_CHAT_ADMINS",
  "GET_CHAT_MEMBER",
  "ANSWER_CALLBACK",
  "ANSWER_INLINE",
  "GET_FILE",
  "GET_ME",
  "GET_UPDATES",
  "SET_WEBHOOK",
  "DELETE_WEBHOOK",
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
  botToken: z.string().optional(),
  chatId: z.string().optional(),
  content: z.string().optional(),
  messageId: z.string().optional(),
  parseMode: z.string().optional(),
  photo: z.string().optional(),
  video: z.string().optional(),
  audio: z.string().optional(),
  document: z.string().optional(),
  sticker: z.string().optional(),
  animation: z.string().optional(),
  caption: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  mediaGroupJson: z.string().optional(),
  chatAction: z.string().optional(),
  userId: z.string().optional(),
  callbackQueryId: z.string().optional(),
  fileId: z.string().optional(),
  webhookUrl: z.string().optional(),
  disableNotification: z.boolean().optional(),
})

export type TelegramFormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: TelegramFormValues) => void
  defaultValues?: Partial<TelegramFormValues>
}

export const TelegramDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<TelegramFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "telegram",
      operation: defaultValues.operation || "SEND_MESSAGE",
      botToken: defaultValues.botToken || "",
      chatId: defaultValues.chatId || "",
      content: defaultValues.content || "",
      messageId: defaultValues.messageId || "",
      parseMode: defaultValues.parseMode || "",
      photo: defaultValues.photo || "",
      video: defaultValues.video || "",
      audio: defaultValues.audio || "",
      document: defaultValues.document || "",
      sticker: defaultValues.sticker || "",
      animation: defaultValues.animation || "",
      caption: defaultValues.caption || "",
      latitude: defaultValues.latitude || "",
      longitude: defaultValues.longitude || "",
      mediaGroupJson: defaultValues.mediaGroupJson || "",
      chatAction: defaultValues.chatAction || "typing",
      userId: defaultValues.userId || "",
      callbackQueryId: defaultValues.callbackQueryId || "",
      fileId: defaultValues.fileId || "",
      webhookUrl: defaultValues.webhookUrl || "",
      disableNotification: defaultValues.disableNotification ?? false,
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      variableName: defaultValues.variableName || "telegram",
      operation: defaultValues.operation || "SEND_MESSAGE",
      botToken: defaultValues.botToken || "",
      chatId: defaultValues.chatId || "",
      content: defaultValues.content || "",
      messageId: defaultValues.messageId || "",
      parseMode: defaultValues.parseMode || "",
      photo: defaultValues.photo || "",
      video: defaultValues.video || "",
      audio: defaultValues.audio || "",
      document: defaultValues.document || "",
      sticker: defaultValues.sticker || "",
      animation: defaultValues.animation || "",
      caption: defaultValues.caption || "",
      latitude: defaultValues.latitude || "",
      longitude: defaultValues.longitude || "",
      mediaGroupJson: defaultValues.mediaGroupJson || "",
      chatAction: defaultValues.chatAction || "typing",
      userId: defaultValues.userId || "",
      callbackQueryId: defaultValues.callbackQueryId || "",
      fileId: defaultValues.fileId || "",
      webhookUrl: defaultValues.webhookUrl || "",
      disableNotification: defaultValues.disableNotification ?? false,
    })
  }, [open, defaultValues, form])

  const op = form.watch("operation") || "SEND_MESSAGE"
  const varName = form.watch("variableName") || "telegram"

  const needsChat = ![
    "GET_ME",
    "GET_UPDATES",
    "SET_WEBHOOK",
    "DELETE_WEBHOOK",
    "ANSWER_CALLBACK",
    "ANSWER_INLINE",
    "GET_FILE",
  ].includes(op)

  const needsText = ["SEND_MESSAGE", "EDIT_MESSAGE", "ANSWER_CALLBACK"].includes(
    op,
  )
  const needsMessageId = [
    "EDIT_MESSAGE",
    "DELETE_MESSAGE",
    "PIN_MESSAGE",
  ].includes(op)

  const handleSubmit = (values: TelegramFormValues) => {
    onSubmit(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Telegram Configuration</DialogTitle>
          <DialogDescription>
            Full Bot API surface via Corsair when enabled. Legacy path uses bot
            token on the node (or credentials).
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
                    <Input placeholder="telegram" {...field} />
                  </FormControl>
                  <FormDescription>
                    {`Output: {{${varName}}}`}
                  </FormDescription>
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
                        {TELEGRAM_OPS.filter((o) =>
                          [
                            "SEND_MESSAGE",
                            "EDIT_MESSAGE",
                            "DELETE_MESSAGE",
                            "PIN_MESSAGE",
                            "UNPIN_MESSAGE",
                            "SEND_CHAT_ACTION",
                          ].includes(o),
                        ).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Media</SelectLabel>
                        {TELEGRAM_OPS.filter((o) =>
                          o.startsWith("SEND_") &&
                          !["SEND_MESSAGE", "SEND_CHAT_ACTION"].includes(o),
                        ).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Chat / Bot</SelectLabel>
                        {TELEGRAM_OPS.filter(
                          (o) =>
                            o.startsWith("GET_") ||
                            o.includes("WEBHOOK") ||
                            o.startsWith("ANSWER_"),
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
              name="botToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bot Token (legacy path)</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="123456:ABC-DEF..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Used when Corsair is off. Prefer credentials + Corsair in
                    production.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {needsChat && (
              <FormField
                control={form.control}
                name="chatId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chat ID</FormLabel>
                    <FormControl>
                      <Input placeholder="-100... or @channel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {needsText && (
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Text</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Hello {{user.name}}"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {needsMessageId && (
              <FormField
                control={form.control}
                name="messageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message ID</FormLabel>
                    <FormControl>
                      <Input placeholder="{{telegram.message_id}}" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {op === "SEND_PHOTO" && (
              <FormField
                control={form.control}
                name="photo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo (file_id or URL)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {op === "SEND_VIDEO" && (
              <FormField
                control={form.control}
                name="video"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            {op === "SEND_DOCUMENT" && (
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            {op === "SEND_LOCATION" && (
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}
            {op === "SEND_MEDIA_GROUP" && (
              <FormField
                control={form.control}
                name="mediaGroupJson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Media Group JSON</FormLabel>
                    <FormControl>
                      <Textarea
                        className="font-mono text-xs min-h-[100px]"
                        placeholder='[{"type":"photo","media":"https://..."}]'
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            {op === "GET_CHAT_MEMBER" && (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            {op === "GET_FILE" && (
              <FormField
                control={form.control}
                name="fileId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            {op === "SET_WEBHOOK" && (
              <FormField
                control={form.control}
                name="webhookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            {op === "ANSWER_CALLBACK" && (
              <FormField
                control={form.control}
                name="callbackQueryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Callback Query ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="disableNotification"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel>Disable notification</FormLabel>
                  <FormControl>
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
