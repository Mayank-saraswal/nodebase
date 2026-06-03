import { NonRetriableError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { whatsappChannel } from "@/inngest/channels/whatsapp"
import { WhatsAppOperation } from "@/generated/prisma"
import { uploadMedia } from "@/lib/media-service"

interface WhatsAppCredential {
  accessToken: string
  phoneNumberId: string
}

type WhatsAppData = {
  nodeId?: string
}

export const whatsappExecutor: NodeExecutor<WhatsAppData> = async ({
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    whatsappChannel().status({
      nodeId,
      status: "loading",
    })
  )

  // Step 1: Load config
  const config = await step.run(`whatsapp-${nodeId}-load-config`, async () => {
    return prisma.whatsAppNode.findUnique({ where: { nodeId } })
  })

  if (!config) {
    await publish(
      whatsappChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "WhatsApp node not configured. Open settings to configure."
    )
  }

  // Step 2: Load and decrypt credential
  const credential = await step.run(
    `whatsapp-${nodeId}-load-credential`,
    async () => {
      if (!config.credentialId) return null
      return prisma.credential.findUnique({
        where: {
          id: config.credentialId,
          userId,
        },
      })
    }
  )

  if (!credential) {
    await publish(
      whatsappChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "WhatsApp credential not found. Please add a WHATSAPP credential first."
    )
  }

  const raw = decrypt(credential.value)
  let creds: WhatsAppCredential
  try {
    creds = JSON.parse(raw)
  } catch {
    await publish(
      whatsappChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      'Invalid WhatsApp credential format. Expected JSON: {"accessToken": "...", "phoneNumberId": "..."}'
    )
  }

  if (!creds.accessToken || !creds.phoneNumberId) {
    await publish(
      whatsappChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "WhatsApp credential missing accessToken or phoneNumberId"
    )
  }

  // Step 3: Resolve template variables and execute
  const result = await step.run(`whatsapp-${nodeId}-execute`, async () => {
    const to = resolveTemplate(config.to, context)
    const body = resolveTemplate(config.body, context)
    const templateName = resolveTemplate(config.templateName, context)
    const mediaUrl = resolveTemplate(config.mediaUrl, context)
    const mediaCaption = resolveTemplate(config.mediaCaption, context)

    if (!to) {
      throw new NonRetriableError(
        "WhatsApp: 'to' phone number is empty. Provide a phone number in E.164 format (e.g. +919876543210)"
      )
    }

    if (!to.startsWith("+")) {
      throw new NonRetriableError(
        `WhatsApp: phone number must be in E.164 format starting with +. ` +
          `Got: "${to}". Example: +919876543210`
      )
    }

    if (!/^\+[1-9]\d{7,14}$/.test(to)) {
      throw new NonRetriableError(
        `WhatsApp: invalid phone number format: "${to}". ` +
          `Use E.164 format: +[country code][number], e.g. +919876543210`
      )
    }

    let payload: Record<string, unknown>

    switch (config.operation) {
      case WhatsAppOperation.SEND_TEXT:
        if (!body)
          throw new NonRetriableError("WhatsApp SEND_TEXT: 'body' is empty")
        payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: false, body },
        }
        break

      case WhatsAppOperation.SEND_TEMPLATE:
        if (!templateName)
          throw new NonRetriableError(
            "WhatsApp SEND_TEMPLATE: 'templateName' is required"
          )
        let params: string[] = []
        try {
          params = JSON.parse(config.templateParams)
        } catch {
          // keep empty
        }
        payload = {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: config.templateLang },
            components:
              params.length > 0
                ? [
                    {
                      type: "body",
                      parameters: params.map((p) => ({
                        type: "text",
                        text: resolveTemplate(p, context),
                      })),
                    },
                  ]
                : [],
          },
        }
        break

      case WhatsAppOperation.SEND_IMAGE: {
        if (!mediaUrl)
          throw new NonRetriableError(
            "WhatsApp SEND_IMAGE: 'mediaUrl' is required"
          )

        // Auto-upload temp/base64 URLs to DigitalOcean Spaces — WhatsApp requires a permanent public HTTPS URL
        let finalMediaUrl = mediaUrl
        const needsUpload =
          mediaUrl.startsWith("data:") ||
          mediaUrl.includes("oaidalleapiprodscus.blob.core.windows.net") ||
          mediaUrl.includes("generativelanguage.googleapis.com")
        if (needsUpload) {
          try {
            const uploadResult = await uploadMedia(
              mediaUrl,
              "image/jpeg",
              {
                userId,
                workflowId: config.workflowId,
                executionId: (context.__executionId as string) ?? undefined,
              }
            )
            finalMediaUrl = uploadResult.url
          } catch (err) {
            console.error("WhatsApp: Failed to upload media to cloud storage:", err)
            // Fall back to original URL — may still work if not actually expired
          }
        }

        payload = {
          messaging_product: "whatsapp",
          to,
          type: "image",
          image: { link: finalMediaUrl, caption: mediaCaption },
        }
        break
      }

      case WhatsAppOperation.SEND_DOCUMENT: {
        if (!mediaUrl)
          throw new NonRetriableError(
            "WhatsApp SEND_DOCUMENT: 'mediaUrl' is required"
          )

        // Auto-upload temp/base64 URLs to DigitalOcean Spaces — WhatsApp requires a permanent public HTTPS URL
        let finalDocUrl = mediaUrl
        const docNeedsUpload =
          mediaUrl.startsWith("data:") ||
          mediaUrl.includes("oaidalleapiprodscus.blob.core.windows.net") ||
          mediaUrl.includes("generativelanguage.googleapis.com")
        if (docNeedsUpload) {
          try {
            const uploadResult = await uploadMedia(
              mediaUrl,
              "application/octet-stream",
              {
                userId,
                workflowId: config.workflowId,
                executionId: (context.__executionId as string) ?? undefined,
              }
            )
            finalDocUrl = uploadResult.url
          } catch (err) {
            console.error("WhatsApp: Failed to upload document to cloud storage:", err)
          }
        }

        payload = {
          messaging_product: "whatsapp",
          to,
          type: "document",
          document: { link: finalDocUrl, caption: mediaCaption },
        }
        break
      }

      case WhatsAppOperation.SEND_REACTION:
        payload = {
          messaging_product: "whatsapp",
          to,
          type: "reaction",
          reaction: {
            message_id: resolveTemplate(config.reactionMsgId, context),
            emoji: config.reactionEmoji,
          },
        }
        break

      default:
        throw new NonRetriableError(
          `Unknown WhatsApp operation: ${config.operation}`
        )
    }

    const apiUrl = `https://graph.facebook.com/v19.0/${creds.phoneNumberId}/messages`

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const errorMsg =
        (error as Record<string, Record<string, string>>)?.error?.message ??
        `HTTP ${response.status}`
      throw new NonRetriableError(`WhatsApp API error: ${errorMsg}`)
    }

    const data = await response.json()

    return {
      ...context,
      whatsapp: {
        messageId: (data as Record<string, Record<string, string>[]>).messages?.[0]?.id,
        to,
        operation: config.operation,
        status: "sent",
        timestamp: new Date().toISOString(),
      },
    }
  })

  await publish(
    whatsappChannel().status({
      nodeId,
      status: "success",
    })
  )

  return result as Record<string, unknown>
}
