import { NonRetriableError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { slackChannel } from "@/inngest/channels/slack"
import { SlackOperation } from "@/generated/prisma"
import { mimeTypeToExt } from "@/lib/media-service"

/* ── Credential types ── */

interface SlackBotCredential {
  type: "bot_token"
  token: string
}

interface SlackWebhookCredential {
  type: "webhook"
  webhookUrl: string
}

type SlackCredential = SlackBotCredential | SlackWebhookCredential

type SlackData = { nodeId?: string }

/* ── Helpers ── */

// Slack webhook messages are truncated as a safety measure; the API limit is 40,000 chars
const MAX_WEBHOOK_MESSAGE_LENGTH = 2000

function getSlackErrorHint(errorCode: string): string {
  const hints: Record<string, string> = {
    channel_not_found: "Channel not found. Check the channel ID or name.",
    not_in_channel: "Bot is not in this channel. Invite the bot first with /invite @botname.",
    invalid_auth: "Invalid Slack token. Check your credential's bot token.",
    missing_scope: "Bot token is missing required scopes. Update scopes in your Slack app settings.",
    not_authed: "No authentication token provided. Add a Slack credential.",
    account_inactive: "Token has been revoked. Generate a new bot token.",
    no_text: "Message text is required.",
    msg_too_long: "Message exceeds Slack's 40,000 character limit.",
    too_many_attachments: "Too many attachments. Maximum is 100.",
    channel_is_archived: "Channel is archived. Unarchive it first.",
    name_taken: "Channel name is already taken. Choose a different name.",
    user_not_found: "User not found. Check the user ID.",
    already_reacted: "You have already reacted with this emoji.",
    no_reaction: "No reaction found to remove.",
    file_not_found: "File not found. Check the file ID.",
    restricted_action: "This action is restricted by workspace admin settings.",
    is_archived: "Channel is archived.",
    already_archived: "Channel is already archived.",
    not_archived: "Channel is not archived.",
    cant_archive_general: "Cannot archive the #general channel.",
    user_not_in_channel: "User is not in this channel.",
    already_in_channel: "User is already in this channel.",
    cant_kick_self: "Bot cannot remove itself from a channel.",
    invalid_timestamp: "Invalid message timestamp. Use the ts value from a previous message.",
    time_in_past: "Scheduled time must be in the future.",
    time_too_far: "Scheduled time is too far in the future. Maximum is 120 days.",
  }
  return hints[errorCode] ?? `Slack API error: ${errorCode}`
}

function parseBlocks(blockKit: string): unknown[] | undefined {
  if (!blockKit.trim()) return undefined
  try {
    const parsed = JSON.parse(blockKit)
    if (!Array.isArray(parsed)) {
      throw new NonRetriableError(
        "Block Kit JSON must be an array of block objects. See https://api.slack.com/block-kit"
      )
    }
    return parsed
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError(
      `Invalid Block Kit JSON: ${(e as Error).message}. Must be valid JSON array.`
    )
  }
}

async function slackRequest(
  method: "GET" | "POST",
  endpoint: string,
  token: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = `https://slack.com/api/${endpoint}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new NonRetriableError(
      `Slack API HTTP error: ${response.status} ${response.statusText}`
    )
  }

  const data = (await response.json()) as Record<string, unknown>

  if (data.ok === false) {
    const errorCode = (data.error as string) ?? "unknown_error"
    throw new NonRetriableError(getSlackErrorHint(errorCode))
  }

  return data
}

async function slackFormDataRequest(
  endpoint: string,
  token: string,
  formData: FormData
): Promise<Record<string, unknown>> {
  const url = `https://slack.com/api/${endpoint}`
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!response.ok) {
    throw new NonRetriableError(
      `Slack API HTTP error: ${response.status} ${response.statusText}`
    )
  }

  const data = (await response.json()) as Record<string, unknown>
  if (data.ok === false) {
    const errorCode = (data.error as string) ?? "unknown_error"
    throw new NonRetriableError(getSlackErrorHint(errorCode))
  }
  return data
}

/* ── Executor ── */

export const slackExecutor: NodeExecutor<SlackData> = async ({
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(slackChannel().status({ nodeId, status: "loading" }))

  // Step 1: Load config from DB
  const config = await step.run(`slack-${nodeId}-load-config`, async () => {
    return prisma.slackNode.findUnique({ where: { nodeId } })
  })

  if (!config) {
    await publish(slackChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError(
      "Slack node not configured. Open settings to configure."
    )
  }

  // Step 2: Load and decrypt credential
  const credential = await step.run(
    `slack-${nodeId}-load-credential`,
    async () => {
      if (!config.credentialId) return null
      return prisma.credential.findUnique({
        where: { id: config.credentialId, userId },
      })
    }
  )

  let creds: SlackCredential | null = null

  if (credential) {
    const raw = decrypt(credential.value)
    try {
      creds = JSON.parse(raw) as SlackCredential
    } catch {
      await publish(slackChannel().status({ nodeId, status: "error" }))
      throw new NonRetriableError(
        'Invalid Slack credential format. Expected JSON: {"type": "bot_token", "token": "xoxb-..."} or {"type": "webhook", "webhookUrl": "..."}'
      )
    }
  }

  const isWebhookOp = config.operation === SlackOperation.MESSAGE_SEND_WEBHOOK

  if (!isWebhookOp && (!creds || creds.type !== "bot_token")) {
    await publish(slackChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError(
      "Slack Bot Token credential required for API operations. Add a SLACK credential with type: bot_token."
    )
  }

  // Step 3: Execute operation
  let result: Record<string, unknown>
  try {
    result = await step.run(`slack-${nodeId}-execute`, async () => {
      const channel = resolveTemplate(config.channel, context)
      const message = resolveTemplate(config.message, context)
      const threadTs = resolveTemplate(config.threadTs, context)
      const messageTs = resolveTemplate(config.messageTs, context)
      const channelName = resolveTemplate(config.channelName, context)
      const channelTopic = resolveTemplate(config.channelTopic, context)
      const channelPurpose = resolveTemplate(config.channelPurpose, context)
      const slackUserId = resolveTemplate(config.userId, context)
      const emoji = resolveTemplate(config.emoji, context)
      const blockKit = resolveTemplate(config.blockKit, context)
      const botName = resolveTemplate(config.botName, context)
      const iconEmojiVal = resolveTemplate(config.iconEmoji, context)
      const filenameVal = resolveTemplate(config.filename, context)
      const fileTypeVal = resolveTemplate(config.fileType, context)
      const titleVal = resolveTemplate(config.title, context)
      const initialCommentVal = resolveTemplate(config.initialComment, context)
      const emailVal = resolveTemplate(config.email, context)
      const statusTextVal = resolveTemplate(config.statusText, context)
      const statusEmojiVal = resolveTemplate(config.statusEmoji, context)
      const statusExpirationVal = resolveTemplate(config.statusExpiration, context)
      const sendAtVal = resolveTemplate(config.sendAt, context)
      const fileIdVal = resolveTemplate(config.fileId, context)
      const contentVal = resolveTemplate(config.content, context)

      const token = creds?.type === "bot_token" ? creds.token : ""

      let apiResult: Record<string, unknown> = {}

      switch (config.operation) {
        // ── Message Operations ──

        case SlackOperation.MESSAGE_SEND_WEBHOOK: {
          const url = creds?.type === "webhook" ? creds.webhookUrl : ""
          if (!url) {
            throw new NonRetriableError(
              "Slack: webhook URL is required for MESSAGE_SEND_WEBHOOK"
            )
          }
          const text = message || contentVal
          if (!text) {
            throw new NonRetriableError(
              "Slack: message content is required for MESSAGE_SEND_WEBHOOK"
            )
          }
          const webhookBody: Record<string, unknown> = {
            text: text.slice(0, MAX_WEBHOOK_MESSAGE_LENGTH),
          }
          const blocks = parseBlocks(blockKit)
          if (blocks) webhookBody.blocks = blocks
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(webhookBody),
          })
          if (!resp.ok) {
            throw new NonRetriableError(
              `Slack webhook error: HTTP ${resp.status}`
            )
          }
          apiResult = { ok: true, success: true }
          break
        }

        case SlackOperation.MESSAGE_SEND: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          if (!message)
            throw new NonRetriableError("Slack: message is required")
          const body: Record<string, unknown> = { channel, text: message }
          if (threadTs) body.thread_ts = threadTs
          if (botName) body.username = botName
          if (iconEmojiVal) body.icon_emoji = iconEmojiVal
          if (config.unfurlLinks === false) body.unfurl_links = false
          const blocks = parseBlocks(blockKit)
          if (blocks) body.blocks = blocks
          const data = await slackRequest("POST", "chat.postMessage", token, body)
          apiResult = {
            messageTs: (data.message as Record<string, unknown>)?.ts ?? data.ts,
            channelId: data.channel,
          }
          break
        }

        case SlackOperation.MESSAGE_UPDATE: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          if (!messageTs)
            throw new NonRetriableError("Slack: message timestamp is required")
          if (!message)
            throw new NonRetriableError("Slack: message text is required")
          const body: Record<string, unknown> = {
            channel,
            ts: messageTs,
            text: message,
          }
          const blocks = parseBlocks(blockKit)
          if (blocks) body.blocks = blocks
          const data = await slackRequest("POST", "chat.update", token, body)
          apiResult = { messageTs: data.ts, channel: data.channel }
          break
        }

        case SlackOperation.MESSAGE_DELETE: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          if (!messageTs)
            throw new NonRetriableError("Slack: message timestamp is required")
          const data = await slackRequest("POST", "chat.delete", token, {
            channel,
            ts: messageTs,
          })
          apiResult = { messageTs: data.ts, channel: data.channel }
          break
        }

        case SlackOperation.MESSAGE_GET_PERMALINK: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          if (!messageTs)
            throw new NonRetriableError("Slack: message timestamp is required")
          const data = await slackRequest(
            "GET",
            `chat.getPermalink?channel=${encodeURIComponent(channel)}&message_ts=${encodeURIComponent(messageTs)}`,
            token
          )
          apiResult = { permalink: data.permalink, channel, messageTs }
          break
        }

        case SlackOperation.MESSAGE_SCHEDULE: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          if (!message)
            throw new NonRetriableError("Slack: message text is required")
          if (!sendAtVal)
            throw new NonRetriableError(
              "Slack: send at (Unix timestamp) is required"
            )
          const body: Record<string, unknown> = {
            channel,
            text: message,
            post_at: Number(sendAtVal),
          }
          const blocks = parseBlocks(blockKit)
          if (blocks) body.blocks = blocks
          const data = await slackRequest(
            "POST",
            "chat.scheduleMessage",
            token,
            body
          )
          apiResult = {
            scheduledMessageId: data.scheduled_message_id,
            postAt: data.post_at,
            channel: data.channel,
          }
          break
        }

        // ── Channel Operations ──

        case SlackOperation.CHANNEL_GET: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          const data = await slackRequest(
            "GET",
            `conversations.info?channel=${encodeURIComponent(channel)}`,
            token
          )
          const ch = data.channel as Record<string, unknown> | undefined
          apiResult = {
            channelId: ch?.id,
            name: ch?.name,
            memberCount: ch?.num_members,
            topic: (ch?.topic as Record<string, unknown>)?.value,
            purpose: (ch?.purpose as Record<string, unknown>)?.value,
          }
          break
        }

        case SlackOperation.CHANNEL_LIST: {
          const params = new URLSearchParams()
          if (config.channelTypes)
            params.set("types", config.channelTypes)
          params.set("limit", String(config.limit || 100))
          if (config.excludeArchived) params.set("exclude_archived", "true")
          const data = await slackRequest(
            "GET",
            `conversations.list?${params.toString()}`,
            token
          )
          const channels = data.channels as unknown[]
          apiResult = { channels, count: channels?.length ?? 0 }
          break
        }

        case SlackOperation.CHANNEL_CREATE: {
          if (!channelName)
            throw new NonRetriableError("Slack: channel name is required")
          const body: Record<string, unknown> = { name: channelName }
          if (config.isPrivate) body.is_private = true
          const data = await slackRequest(
            "POST",
            "conversations.create",
            token,
            body
          )
          const ch = data.channel as Record<string, unknown> | undefined
          apiResult = {
            channelId: ch?.id,
            name: ch?.name,
            memberCount: ch?.num_members ?? 0,
          }
          break
        }

        case SlackOperation.CHANNEL_ARCHIVE: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          await slackRequest("POST", "conversations.archive", token, {
            channel,
          })
          apiResult = { ok: true, channel }
          break
        }

        case SlackOperation.CHANNEL_UNARCHIVE: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          await slackRequest("POST", "conversations.unarchive", token, {
            channel,
          })
          apiResult = { ok: true, channel }
          break
        }

        case SlackOperation.CHANNEL_INVITE: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          if (!slackUserId)
            throw new NonRetriableError("Slack: user IDs are required")
          await slackRequest("POST", "conversations.invite", token, {
            channel,
            users: slackUserId,
          })
          apiResult = { ok: true, channel, users: slackUserId }
          break
        }

        case SlackOperation.CHANNEL_KICK: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          if (!slackUserId)
            throw new NonRetriableError("Slack: user ID is required")
          await slackRequest("POST", "conversations.kick", token, {
            channel,
            user: slackUserId,
          })
          apiResult = { ok: true, channel, user: slackUserId }
          break
        }

        case SlackOperation.CHANNEL_SET_TOPIC: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          await slackRequest("POST", "conversations.setTopic", token, {
            channel,
            topic: channelTopic,
          })
          apiResult = { ok: true, channel, topic: channelTopic }
          break
        }

        case SlackOperation.CHANNEL_SET_PURPOSE: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          await slackRequest("POST", "conversations.setPurpose", token, {
            channel,
            purpose: channelPurpose,
          })
          apiResult = { ok: true, channel, purpose: channelPurpose }
          break
        }

        // ── User Operations ──

        case SlackOperation.USER_GET: {
          if (!slackUserId)
            throw new NonRetriableError("Slack: user ID is required")
          const data = await slackRequest(
            "GET",
            `users.info?user=${encodeURIComponent(slackUserId)}`,
            token
          )
          const user = data.user as Record<string, unknown> | undefined
          const profile = user?.profile as Record<string, unknown> | undefined
          apiResult = {
            userId: user?.id,
            email: profile?.email,
            displayName: profile?.display_name ?? user?.real_name,
          }
          break
        }

        case SlackOperation.USER_GET_BY_EMAIL: {
          if (!emailVal)
            throw new NonRetriableError("Slack: email is required")
          const data = await slackRequest(
            "GET",
            `users.lookupByEmail?email=${encodeURIComponent(emailVal)}`,
            token
          )
          const user = data.user as Record<string, unknown> | undefined
          const profile = user?.profile as Record<string, unknown> | undefined
          apiResult = {
            userId: user?.id,
            email: profile?.email,
            displayName: profile?.display_name ?? user?.real_name,
          }
          break
        }

        case SlackOperation.USER_LIST: {
          const data = await slackRequest(
            "GET",
            `users.list?limit=${config.limit || 100}`,
            token
          )
          const members = data.members as unknown[]
          apiResult = { users: members, count: members?.length ?? 0 }
          break
        }

        case SlackOperation.USER_SET_STATUS: {
          if (!statusTextVal)
            throw new NonRetriableError("Slack: status text is required")
          const profile: Record<string, unknown> = {
            status_text: statusTextVal,
            status_emoji: statusEmojiVal || "",
            status_expiration: statusExpirationVal
              ? Number(statusExpirationVal)
              : 0,
          }
          await slackRequest("POST", "users.profile.set", token, { profile })
          apiResult = { ok: true, statusText: statusTextVal }
          break
        }

        // ── Reaction Operations ──

        case SlackOperation.REACTION_ADD: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          if (!messageTs)
            throw new NonRetriableError("Slack: message timestamp is required")
          if (!emoji)
            throw new NonRetriableError("Slack: emoji is required")
          await slackRequest("POST", "reactions.add", token, {
            channel,
            timestamp: messageTs,
            name: emoji,
          })
          apiResult = { ok: true, emoji, channel, messageTs }
          break
        }

        case SlackOperation.REACTION_REMOVE: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          if (!messageTs)
            throw new NonRetriableError("Slack: message timestamp is required")
          if (!emoji)
            throw new NonRetriableError("Slack: emoji is required")
          await slackRequest("POST", "reactions.remove", token, {
            channel,
            timestamp: messageTs,
            name: emoji,
          })
          apiResult = { ok: true, emoji, channel, messageTs }
          break
        }

        case SlackOperation.REACTION_GET: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          if (!messageTs)
            throw new NonRetriableError("Slack: message timestamp is required")
          const data = await slackRequest(
            "GET",
            `reactions.get?channel=${encodeURIComponent(channel)}&timestamp=${encodeURIComponent(messageTs)}`,
            token
          )
          const msg = data.message as Record<string, unknown> | undefined
          apiResult = { reactions: msg?.reactions ?? [] }
          break
        }

        // ── File Operations ──

        case SlackOperation.FILE_UPLOAD: {
          if (!channel)
            throw new NonRetriableError("Slack: channel is required")
          if (!filenameVal)
            throw new NonRetriableError("Slack: filename is required")

          // Check if content looks like a URL — if so, use Slack v2 upload API with fetched bytes
          const isUrlSource = contentVal.startsWith("https://") || contentVal.startsWith("http://")

          if (isUrlSource) {
            // Slack v2 upload API: fetch bytes from URL, then upload
            const fetchResp = await fetch(contentVal, {
              signal: AbortSignal.timeout(60000),
            })
            if (!fetchResp.ok) {
              throw new NonRetriableError(
                `Slack FILE_UPLOAD: Failed to fetch file from URL (${fetchResp.status}): ${contentVal.slice(0, 100)}`
              )
            }
            const fileBuffer = Buffer.from(await fetchResp.arrayBuffer())
            const mimeType = fetchResp.headers.get("content-type") ?? "application/octet-stream"
            const ext = mimeTypeToExt(mimeType)
            const filename = filenameVal || `upload.${ext}`

            // Step 1: Get upload URL
            const urlResp = await slackRequest("GET",
              `files.getUploadURLExternal?filename=${encodeURIComponent(filename)}&length=${fileBuffer.length}`,
              token
            ) as Record<string, string>

            const uploadUrl = urlResp.upload_url as string
            const fileId = urlResp.file_id as string

            if (!uploadUrl || !fileId) {
              throw new NonRetriableError("Slack FILE_UPLOAD: Failed to get upload URL from Slack v2 API")
            }

            // Step 2: Upload bytes to the Slack-provided URL
            const uploadResp = await fetch(uploadUrl, {
              method: "POST",
              headers: {
                "Content-Type": mimeType,
                Authorization: `Bearer ${token}`,
              },
              body: fileBuffer,
            })
            if (!uploadResp.ok) {
              throw new NonRetriableError(
                `Slack FILE_UPLOAD: Failed to upload file bytes (${uploadResp.status})`
              )
            }

            // Step 3: Complete upload
            const completeBody: Record<string, unknown> = {
              files: [{ id: fileId, title: titleVal || filename }],
              channel_id: channel,
            }
            if (initialCommentVal) completeBody.initial_comment = initialCommentVal
            const completeData = await slackRequest(
              "POST",
              "files.completeUploadExternal",
              token,
              completeBody
            )
            const files = (completeData.files as Array<Record<string, unknown>>) ?? []
            apiResult = {
              fileId: files[0]?.id ?? fileId,
              permalink: files[0]?.permalink,
              filename,
            }
          } else {
            // Fallback: legacy text-content upload
            const fileContent = contentVal || message
            if (!fileContent)
              throw new NonRetriableError(
                "Slack: file content or URL is required for FILE_UPLOAD"
              )
            const formData = new FormData()
            formData.append("channels", channel)
            formData.append(
              "content",
              new Blob([fileContent], { type: "text/plain" }),
              filenameVal
            )
            if (filenameVal) formData.append("filename", filenameVal)
            if (fileTypeVal) formData.append("filetype", fileTypeVal)
            if (titleVal) formData.append("title", titleVal)
            if (initialCommentVal)
              formData.append("initial_comment", initialCommentVal)
            const data = await slackFormDataRequest(
              "files.upload",
              token,
              formData
            )
            const file = data.file as Record<string, unknown> | undefined
            apiResult = {
              fileId: file?.id,
              permalink: file?.permalink,
            }
          }
          break
        }

        case SlackOperation.FILE_GET: {
          if (!fileIdVal)
            throw new NonRetriableError("Slack: file ID is required")
          const data = await slackRequest(
            "GET",
            `files.info?file=${encodeURIComponent(fileIdVal)}`,
            token
          )
          apiResult = data.file as Record<string, unknown>
          break
        }

        case SlackOperation.FILE_DELETE: {
          if (!fileIdVal)
            throw new NonRetriableError("Slack: file ID is required")
          await slackRequest("POST", "files.delete", token, {
            file: fileIdVal,
          })
          apiResult = { ok: true, fileId: fileIdVal }
          break
        }

        default:
          throw new NonRetriableError(
            `Unknown or unsupported Slack operation: ${config.operation}`
          )
      }

      return {
        ...context,
        [config.variableName || "slack"]: {
          operation: config.operation,
          ...apiResult,
          timestamp: new Date().toISOString(),
        },
      }
    })
  } catch (error) {
    await publish(slackChannel().status({ nodeId, status: "error" }))
    throw error
  }

  await publish(slackChannel().status({ nodeId, status: "success" }))
  return result as Record<string, unknown>
}
