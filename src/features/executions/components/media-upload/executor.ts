import { NonRetriableError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { mediaUploadChannel } from "@/inngest/channels/media-upload"
import { uploadMedia } from "@/lib/media-service"

export const mediaUploadExecutor: NodeExecutor = async ({
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  // STEP 1: Load config
  const config = await step.run(`media-upload-${nodeId}-load`, async () => {
    const node = await prisma.mediaUploadNode.findUnique({
      where: { nodeId },
      include: { workflow: { select: { userId: true } } },
    })
    if (!node) throw new NonRetriableError("MediaUpload node not configured")
    if (node.workflow.userId !== userId) throw new NonRetriableError("Unauthorized")
    return node
  })

  // STEP 2: Validate
  await step.run(`media-upload-${nodeId}-validate`, async () => {
    const input = resolveTemplate(config.inputField, context)
    if (!input?.trim()) {
      throw new NonRetriableError(
        `MediaUpload: input resolved to empty. Template: "${config.inputField}"`
      )
    }
    return { valid: true }
  })

  // STEP 3: Execute — publish AND uploadMedia BOTH inside here
  return await step.run(`media-upload-${nodeId}-execute`, async () => {
    await publish(mediaUploadChannel(nodeId).status({ nodeId, status: "loading" }))
    try {
      const inputFieldVal = resolveTemplate(config.inputField, context)
      const result = await uploadMedia(
        inputFieldVal,
        config.mimeTypeHint || "application/octet-stream",
        {
          userId,
          workflowId: config.workflowId,
          executionId: (context.__executionId as string) ?? undefined,
          filename: config.filename
            ? resolveTemplate(config.filename, context)
            : undefined,
        }
      )
      await publish(mediaUploadChannel(nodeId).status({ nodeId, status: "success" }))
      return {
        ...context,
        [config.variableName]: {
          url: result.publicUrl,
          mimeType: result.mimeType,
          sizeBytes: result.sizeBytes,
          originalSource: inputFieldVal,
        },
      }
    } catch (err) {
      await publish(mediaUploadChannel(nodeId).status({ nodeId, status: "error" }))
      if (config.continueOnFail) {
        return {
          ...context,
          [config.variableName]: {
            error: err instanceof Error ? err.message : String(err),
          },
        }
      }
      throw new NonRetriableError(
        `MediaUpload failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  })
}
