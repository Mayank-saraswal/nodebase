import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor, WorkflowContext } from "@/features/executions/types"
import { asString } from "@/features/executions/types"
import prisma from "@/lib/db"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { googleDriveChannel } from "@/inngest/channels/google-drive"
import { refreshGoogleDriveAccessToken } from "@/lib/google-drive-auth"
import {
  mapCorsairError,
  resolveTenantId,
} from "@/lib/corsair"
import { tryRunIntegration } from "@/features/integrations/runner"
import { NodeType } from "@/generated/prisma"

const DRIVE_API = "https://www.googleapis.com/drive/v3"
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3"

export const googleDriveExecutor: NodeExecutor = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
  tenantId: tenantIdParam,
}): Promise<WorkflowContext> => {
  await publish(googleDriveChannel().status({ nodeId, status: "loading" }))

  // unknown: Node.data JSON boundary
  const config = (data ?? {}) as Record<string, unknown>
  const credentialId = asString(config.credentialId)
  const operation = asString(config.operation, "LIST_FILES")

  // ── Corsair backbone path (Option C generic runner) ──
  {
    const tenantId =
      tenantIdParam && tenantIdParam.trim() !== ""
        ? tenantIdParam
        : resolveTenantId({ userId })
    try {
      const corsairResult = await step.run(
        `drive-${nodeId}-corsair`,
        async () => {
          return tryRunIntegration({
            nodeType: NodeType.GOOGLE_DRIVE,
            data: config,
            context,
            nodeId,
            userId,
            tenantId,
          })
        },
      )
      if (corsairResult) {
        await publish(googleDriveChannel().status({ nodeId, status: "success" }))
        return corsairResult.context
      }
    } catch (error) {
      await publish(googleDriveChannel().status({ nodeId, status: "error" }))
      if (
        error instanceof NonRetriableError ||
        error instanceof RetryAfterError
      ) {
        throw error
      }
      mapCorsairError(error, "Google Drive")
    }
  }

  // ── Legacy path (Cryptr credentials + Drive REST) ──
  if (!credentialId) {
    await publish(googleDriveChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError("Google Drive node is missing credential")
  }

  // Execute operation — load access token inline
  const result = await step.run(`drive-${nodeId}-execute`, async () => {
    let token: string
    try {
      token = await refreshGoogleDriveAccessToken(credentialId, userId)
    } catch (err) {
      await publish(googleDriveChannel().status({ nodeId, status: "error" }))
      throw new NonRetriableError(
        err instanceof Error
          ? err.message
          : "Google Drive: Failed to get access token",
      )
    }

    switch (operation) {
      case "UPLOAD_FILE": {
        // Get file content from context (previous node output)
        const fileContent =
          context.fileContent ??
          (context.body as Record<string, unknown> | undefined)?.fileContent
        const fileName = resolveTemplate(
          asString(config.fileName, "untitled"),
          context,
        )
        const mimeType = asString(config.mimeType, "application/octet-stream")

        if (!fileContent) {
          throw new NonRetriableError(
            "UPLOAD_FILE requires fileContent in context from a previous node"
          )
        }

        // Multipart upload
        const metadata = {
          name: fileName,
          ...(asString(config.folderId)
            ? { parents: [asString(config.folderId)] }
            : {}),
        }

        const boundary = "nodebase_boundary"
        const body = [
          `--${boundary}`,
          "Content-Type: application/json; charset=UTF-8",
          "",
          JSON.stringify(metadata),
          `--${boundary}`,
          `Content-Type: ${mimeType}`,
          "",
          typeof fileContent === "string" ? fileContent : JSON.stringify(fileContent),
          `--${boundary}--`,
        ].join("\r\n")

        const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body,
        })
        const file = await res.json()
        if (!res.ok) throw new Error(`Drive upload failed: ${file.error?.message}`)

        return {
          ...context,
          googleDrive: {
            operation: "UPLOAD_FILE",
            fileId: file.id,
            fileName: file.name,
            mimeType: file.mimeType,
            webViewLink: file.webViewLink,
          },
        }
      }

      case "DOWNLOAD_FILE": {
        const fileId = resolveTemplate(asString(config.fileId), context)
        if (!fileId) throw new NonRetriableError("DOWNLOAD_FILE requires a fileId")

        // Get file metadata first
        const metaRes = await fetch(`${DRIVE_API}/files/${fileId}?fields=id,name,mimeType,size`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const meta = await metaRes.json()
        if (!metaRes.ok) throw new Error(`Drive metadata failed: ${meta.error?.message}`)

        // Download content
        const contentRes = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const content = await contentRes.text()
        if (!contentRes.ok) throw new Error(`Drive download failed`)

        return {
          ...context,
          googleDrive: {
            operation: "DOWNLOAD_FILE",
            fileId: meta.id,
            fileName: meta.name,
            mimeType: meta.mimeType,
            fileContent: content,
          },
        }
      }

      case "LIST_FILES": {
        const q = config.query
          ? resolveTemplate(asString(config.query), context)
          : asString(config.folderId)
            ? `'${asString(config.folderId)}' in parents and trashed=false`
            : "trashed=false"

        const params = new URLSearchParams({
          q,
          pageSize: String(config.maxResults ?? 10),
          fields: "files(id,name,mimeType,size,modifiedTime,webViewLink)",
        })

        const res = await fetch(`${DRIVE_API}/files?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(`Drive list failed: ${data.error?.message}`)

        return {
          ...context,
          googleDrive: {
            operation: "LIST_FILES",
            files: data.files,
            count: data.files?.length ?? 0,
          },
        }
      }

      case "CREATE_FOLDER": {
        const folderName = resolveTemplate(
          asString(config.fileName, "New Folder"),
          context,
        )

        const res = await fetch(`${DRIVE_API}/files`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            ...(asString(config.folderId)
            ? { parents: [asString(config.folderId)] }
            : {}),
          }),
        })
        const folder = await res.json()
        if (!res.ok) throw new Error(`Drive folder creation failed: ${folder.error?.message}`)

        return {
          ...context,
          googleDrive: {
            operation: "CREATE_FOLDER",
            folderId: folder.id,
            folderName: folder.name,
          },
        }
      }

      default:
        throw new NonRetriableError(`Unknown operation: ${config.operation}`)
    }
  })

  await publish(googleDriveChannel().status({ nodeId, status: "success" }))
  return result as Record<string, unknown>
}
