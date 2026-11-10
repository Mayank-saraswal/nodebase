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
import { Separator } from "@/components/ui/separator"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const X_OPS = ["POST_TWEET", "REPLY_TWEET"] as const

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[a-zA-Z_][a-zA-Z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and can only contain letters, numbers, and underscores",
    }),
  operation: z.string().min(1),
  content: z.string().optional(),
  inReplyToTweetId: z.string().optional(),
  quoteTweetId: z.string().optional(),
  mediaIds: z.string().optional(),
  replySettings: z.string().optional(),
  /** Legacy OAuth1 keys — when set, forces legacy twitter-api-v2 path */
  apiKey: z.string().optional(),
  apiSecretKey: z.string().optional(),
  accessToken: z.string().optional(),
  accessTokenSecret: z.string().optional(),
})

export type XFormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: XFormValues) => void
  defaultValues?: Partial<XFormValues>
}

export const XDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<XFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "x",
      operation: defaultValues.operation || "POST_TWEET",
      content: defaultValues.content || "",
      inReplyToTweetId: defaultValues.inReplyToTweetId || "",
      quoteTweetId: defaultValues.quoteTweetId || "",
      mediaIds: defaultValues.mediaIds || "",
      replySettings: defaultValues.replySettings || "",
      apiKey: defaultValues.apiKey || "",
      apiSecretKey: defaultValues.apiSecretKey || "",
      accessToken: defaultValues.accessToken || "",
      accessTokenSecret: defaultValues.accessTokenSecret || "",
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      variableName: defaultValues.variableName || "x",
      operation: defaultValues.operation || "POST_TWEET",
      content: defaultValues.content || "",
      inReplyToTweetId: defaultValues.inReplyToTweetId || "",
      quoteTweetId: defaultValues.quoteTweetId || "",
      mediaIds: defaultValues.mediaIds || "",
      replySettings: defaultValues.replySettings || "",
      apiKey: defaultValues.apiKey || "",
      apiSecretKey: defaultValues.apiSecretKey || "",
      accessToken: defaultValues.accessToken || "",
      accessTokenSecret: defaultValues.accessTokenSecret || "",
    })
  }, [open, defaultValues, form])

  const op = form.watch("operation") || "POST_TWEET"
  const varName = form.watch("variableName") || "x"
  const contentLen = (form.watch("content") || "").length

  const handleSubmit = (values: XFormValues) => {
    onSubmit(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>X (Twitter) Configuration</DialogTitle>
          <DialogDescription>
            Post/reply via Corsair OAuth when enabled. Optional OAuth 1.0a keys
            force the legacy twitter-api-v2 path.
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
                    <Input placeholder="x" {...field} />
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
                      {X_OPS.map((o) => (
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
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tweet text</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What's happening?"
                      className="min-h-24"
                      maxLength={280}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{contentLen}/280</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {op === "REPLY_TWEET" && (
              <FormField
                control={form.control}
                name="inReplyToTweetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>In-reply-to tweet ID</FormLabel>
                    <FormControl>
                      <Input placeholder="tweet id" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {op === "POST_TWEET" && (
              <>
                <FormField
                  control={form.control}
                  name="quoteTweetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quote tweet ID (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="tweet id" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mediaIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Media IDs (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="id1, id2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="replySettings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reply settings</FormLabel>
                      <Select
                        value={field.value || "default"}
                        onValueChange={(v) =>
                          field.onChange(v === "default" ? "" : v)
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Everyone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="default">Everyone</SelectItem>
                          <SelectItem value="following">Following</SelectItem>
                          <SelectItem value="mentionedUsers">
                            Mentioned users
                          </SelectItem>
                          <SelectItem value="subscribers">
                            Subscribers
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <Separator />
            <p className="text-xs text-muted-foreground">
              Legacy OAuth 1.0a (optional — leave empty for Corsair OAuth)
            </p>

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apiSecretKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Secret Key</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accessToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Token</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accessTokenSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Token Secret</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="off" {...field} />
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
