import { NonRetriableError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { msg91Channel } from "@/inngest/channels/msg91"
import { Msg91Operation } from "@/features/executions/enums"

interface Msg91Credential {
  authKey: string
}

type Msg91Data = {
  nodeId?: string
}

async function msg91Request(
  method: string,
  url: string,
  authKey: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      authkey: authKey,
    },
  }

  if (body && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)

  if (response.status === 429) {
    throw new NonRetriableError("MSG91 rate limit exceeded. Try again later.")
  }

  if (response.status === 401) {
    throw new NonRetriableError(
      "Invalid MSG91 auth key. Check your credential."
    )
  }

  if (response.status >= 500) {
    throw new NonRetriableError(`MSG91 server error: HTTP ${response.status}`)
  }

  const text = await response.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return { message: text }
  }
}

export const msg91Executor: NodeExecutor<Msg91Data> = async ({ data, nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    msg91Channel().status({
      nodeId,
      status: "loading",
    })
  )

  // Step 1: Load config
  const config = data as any;

if (!config) {
    await publish(
      msg91Channel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "MSG91 node not configured. Open settings to configure."
    )
  }

  // Step 2: Load and decrypt credential
  const credential = await step.run(
    `msg91-${nodeId}-load-credential`,
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
      msg91Channel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "MSG91 credential not found. Please add a MSG91 credential first."
    )
  }

  const raw = decrypt(credential.value)
  let creds: Msg91Credential
  try {
    creds = JSON.parse(raw)
  } catch {
    await publish(
      msg91Channel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "Failed to decrypt MSG91 credential. Re-save it."
    )
  }

  const authKey = creds.authKey
  const variableName = config.variableName || "msg91"

  // Step 3: Execute operation
  const result = await step.run(
    `msg91-${nodeId}-execute`,
    async (): Promise<Record<string, unknown>> => {
      try {
        switch (config.operation) {
          // ── SMS ──────────────────────────────────────────────────
          case Msg91Operation.SEND_SMS: {
            const mobile = resolveTemplate(config.mobile, context)
            let smsVars: Record<string, unknown> = {}
            try {
              smsVars = JSON.parse(
                resolveTemplate(config.smsVariables, context)
              )
            } catch {
              /* empty vars */
            }

            const responseData = await msg91Request(
              "POST",
              "https://api.msg91.com/api/v5/flow/",
              authKey,
              {
                flow_id: config.flowId,
                sender: config.senderId,
                mobiles: mobile,
                ...smsVars,
              }
            )

            return {
              operation: "SEND_SMS",
              requestId:
                (responseData as Record<string, string>).request_id ?? null,
              status: "success",
              mobile,
              timestamp: new Date().toISOString(),
            }
          }

          case Msg91Operation.SEND_BULK_SMS: {
            let recipients: Array<Record<string, unknown>> = []
            try {
              recipients = JSON.parse(
                resolveTemplate(config.bulkData, context)
              )
            } catch {
              throw new NonRetriableError(
                "Invalid bulkData JSON. Provide a JSON array of recipients."
              )
            }

            const responseData = await msg91Request(
              "POST",
              "https://api.msg91.com/api/v5/flow/",
              authKey,
              {
                flow_id: config.flowId,
                sender: config.senderId,
                recipients: recipients.map((r) => ({
                  mobiles: r.mobile,
                  ...r,
                })),
              }
            )

            return {
              operation: "SEND_BULK_SMS",
              requestId:
                (responseData as Record<string, string>).request_id ?? null,
              count: recipients.length,
              status: "queued",
              timestamp: new Date().toISOString(),
            }
          }

          case Msg91Operation.SEND_TRANSACTIONAL: {
            const mobile = resolveTemplate(config.mobile, context)
            const message = resolveTemplate(config.message, context)

            const params = new URLSearchParams({
              authkey: authKey,
              mobiles: mobile,
              message,
              sender: config.senderId,
              route: "4",
              country: "91",
              unicode: "1",
            })

            const responseData = await msg91Request(
              "GET",
              `https://api.msg91.com/api/sendhttp.php?${params.toString()}`,
              authKey
            )

            return {
              operation: "SEND_TRANSACTIONAL",
              requestId:
                (responseData as Record<string, string>).request_id ??
                (responseData as Record<string, string>).message ??
                null,
              status: "success",
              mobile,
              timestamp: new Date().toISOString(),
            }
          }

          case Msg91Operation.SCHEDULE_SMS: {
            const mobile = resolveTemplate(config.mobile, context)
            let smsVars: Record<string, unknown> = {}
            try {
              smsVars = JSON.parse(
                resolveTemplate(config.smsVariables, context)
              )
            } catch {
              /* empty vars */
            }

            const responseData = await msg91Request(
              "POST",
              "https://api.msg91.com/api/v5/flow/",
              authKey,
              {
                flow_id: config.flowId,
                sender: config.senderId,
                mobiles: mobile,
                scheduled_time: resolveTemplate(config.scheduleTime, context),
                ...smsVars,
              }
            )

            return {
              operation: "SCHEDULE_SMS",
              requestId:
                (responseData as Record<string, string>).request_id ?? null,
              status: "scheduled",
              mobile,
              scheduledTime: resolveTemplate(config.scheduleTime, context),
              timestamp: new Date().toISOString(),
            }
          }

          // ── OTP ──────────────────────────────────────────────────
          case Msg91Operation.SEND_OTP: {
            const mobile = resolveTemplate(config.mobile, context)

            const params = new URLSearchParams({
              authkey: authKey,
              mobile,
              template_id: config.otpTemplateId,
              otp_length: String(config.otpLength),
              otp_expiry: String(config.otpExpiry),
            })

            const responseData = await msg91Request(
              "POST",
              `https://api.msg91.com/api/v5/otp?${params.toString()}`,
              authKey
            )

            return {
              operation: "SEND_OTP",
              status: "success",
              mobile,
              message:
                (responseData as Record<string, string>).message ??
                "OTP sent successfully",
              timestamp: new Date().toISOString(),
            }
          }

          case Msg91Operation.VERIFY_OTP: {
            const mobile = resolveTemplate(config.mobile, context)
            const otp = resolveTemplate(config.otpValue, context)

            const params = new URLSearchParams({
              authkey: authKey,
              mobile,
              otp,
            })

            const responseData = await msg91Request(
              "GET",
              `https://api.msg91.com/api/v5/otp/verify?${params.toString()}`,
              authKey
            )

            const isSuccess =
              (responseData as Record<string, string>).type === "success"

            if (!isSuccess && !config.continueOnFail) {
              throw new NonRetriableError(
                "OTP verification failed: " +
                  ((responseData as Record<string, string>).message ??
                    "OTP does not match")
              )
            }

            return {
              operation: "VERIFY_OTP",
              verified: isSuccess,
              mobile,
              ...(isSuccess
                ? {}
                : { error: "OTP verification failed" }),
              timestamp: new Date().toISOString(),
            }
          }

          case Msg91Operation.RESEND_OTP: {
            const mobile = resolveTemplate(config.mobile, context)

            const params = new URLSearchParams({
              authkey: authKey,
              mobile,
              retrytype: config.retryType,
            })

            const responseData = await msg91Request(
              "GET",
              `https://api.msg91.com/api/v5/otp/retry?${params.toString()}`,
              authKey
            )

            return {
              operation: "RESEND_OTP",
              status: "success",
              mobile,
              retryType: config.retryType,
              message:
                (responseData as Record<string, string>).message ?? "OTP resent",
              timestamp: new Date().toISOString(),
            }
          }

          case Msg91Operation.INVALIDATE_OTP: {
            const mobile = resolveTemplate(config.mobile, context)

            const params = new URLSearchParams({
              authkey: authKey,
              mobile,
            })

            await msg91Request(
              "GET",
              `https://api.msg91.com/api/v5/otp/invalidate?${params.toString()}`,
              authKey
            )

            return {
              operation: "INVALIDATE_OTP",
              status: "success",
              mobile,
              timestamp: new Date().toISOString(),
            }
          }

          // ── WHATSAPP ─────────────────────────────────────────────
          case Msg91Operation.SEND_WHATSAPP: {
            const mobile = resolveTemplate(config.mobile, context)
            let components: unknown[] = []
            try {
              components = JSON.parse(
                resolveTemplate(config.whatsappParams, context)
              )
            } catch {
              /* empty components */
            }

            const responseData = await msg91Request(
              "POST",
              "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
              authKey,
              {
                integrated_number: resolveTemplate(
                  config.integratedNumber,
                  context
                ),
                content_type: "template",
                payload: {
                  messaging_product: "whatsapp",
                  type: "template",
                  template: {
                    name: resolveTemplate(config.whatsappTemplate, context),
                    language: { code: config.whatsappLang },
                    components,
                  },
                  to: mobile,
                },
              }
            )

            return {
              operation: "SEND_WHATSAPP",
              status: "success",
              messageId:
                (responseData as Record<string, string>).message_id ?? null,
              mobile,
              template: config.whatsappTemplate,
              timestamp: new Date().toISOString(),
            }
          }

          case Msg91Operation.SEND_WHATSAPP_MEDIA: {
            const mobile = resolveTemplate(config.mobile, context)

            const responseData = await msg91Request(
              "POST",
              "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
              authKey,
              {
                integrated_number: resolveTemplate(
                  config.integratedNumber,
                  context
                ),
                content_type: "media",
                payload: {
                  messaging_product: "whatsapp",
                  to: mobile,
                  type: config.mediaType,
                  [config.mediaType]: {
                    link: resolveTemplate(config.mediaUrl, context),
                    caption: resolveTemplate(config.mediaCaption, context),
                  },
                },
              }
            )

            return {
              operation: "SEND_WHATSAPP_MEDIA",
              status: "success",
              messageId:
                (responseData as Record<string, string>).message_id ?? null,
              mobile,
              mediaType: config.mediaType,
              timestamp: new Date().toISOString(),
            }
          }

          // ── VOICE OTP ────────────────────────────────────────────
          case Msg91Operation.SEND_VOICE_OTP: {
            const mobile = resolveTemplate(config.mobile, context)

            const params = new URLSearchParams({
              authkey: authKey,
              mobile,
              template_id: config.otpTemplateId,
              otp_length: String(config.otpLength),
              otp_expiry: String(config.otpExpiry),
              voice: "1",
            })

            const responseData = await msg91Request(
              "POST",
              `https://api.msg91.com/api/v5/otp?${params.toString()}`,
              authKey
            )

            return {
              operation: "SEND_VOICE_OTP",
              status: "success",
              mobile,
              message:
                (responseData as Record<string, string>).message ??
                "Voice OTP sent",
              timestamp: new Date().toISOString(),
            }
          }

          // ── EMAIL ────────────────────────────────────────────────
          case Msg91Operation.SEND_EMAIL: {
            const responseData = await msg91Request(
              "POST",
              "https://api.msg91.com/api/v5/email/send",
              authKey,
              {
                recipients: [
                  {
                    to: [
                      {
                        email: resolveTemplate(config.toEmail, context),
                        name: "",
                      },
                    ],
                  },
                ],
                from: {
                  email: config.fromEmail,
                  name: config.fromName,
                },
                subject: resolveTemplate(config.subject, context),
                body: resolveTemplate(config.emailBody, context),
              }
            )

            return {
              operation: "SEND_EMAIL",
              status: "success",
              toEmail: resolveTemplate(config.toEmail, context),
              message:
                (responseData as Record<string, string>).message ??
                "Email sent",
              timestamp: new Date().toISOString(),
            }
          }

          // ── ANALYTICS ────────────────────────────────────────────
          case Msg91Operation.GET_BALANCE: {
            const params = new URLSearchParams({
              authkey: authKey,
              type: "1",
            })

            const responseData = await msg91Request(
              "GET",
              `https://api.msg91.com/api/balance.php?${params.toString()}`,
              authKey
            )

            return {
              operation: "GET_BALANCE",
              balance: parseFloat(
                String(
                  (responseData as Record<string, string>).balance ?? "0"
                )
              ),
              type: "SMS",
              timestamp: new Date().toISOString(),
            }
          }

          case Msg91Operation.GET_REPORT: {
            const reqId = resolveTemplate(config.requestId, context)
            const params = new URLSearchParams({
              authkey: authKey,
              requestId: reqId,
            })

            const responseData = await msg91Request(
              "GET",
              `https://api.msg91.com/api/v5/report/sms/detail?${params.toString()}`,
              authKey
            )

            return {
              operation: "GET_REPORT",
              requestId: reqId,
              reports:
                (responseData as Record<string, unknown[]>).data ?? [],
              timestamp: new Date().toISOString(),
            }
          }

          default:
            throw new NonRetriableError(
              `Unknown MSG91 operation: ${config.operation}`
            )
        }
      } catch (err) {
        if (
          err instanceof NonRetriableError
        ) {
          throw err
        }

        if (config.continueOnFail) {
          return {
            operation: config.operation,
            success: false,
            error: err instanceof Error ? err.message : String(err),
            timestamp: new Date().toISOString(),
          }
        }
        throw new NonRetriableError(
          `MSG91 error: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }
  )

  await publish(
    msg91Channel().status({
      nodeId,
      status: "success",
    })
  )

  return {
    ...context,
    [variableName]: result,
  }
}
