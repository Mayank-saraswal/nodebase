/**
 * Google Drive Corsair adapter — templates → runGoogleDriveOperation → context slice.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t, tNumber } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  runGoogleDriveOperation,
  type DriveApiClient,
  type ResolvedDriveFields,
} from "./operations"

function num(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export const googleDriveAdapter: IntegrationAdapter = {
  pluginId: "googledrive",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    // unknown: Node.data JSON boundary
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "LIST_FILES")
    const variableName = String(config.variableName || "googleDrive")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError(
        "Google Drive Corsair: missing tenant client. Ensure multi-tenant Corsair is configured.",
      )
    }

    const driveClient = client as DriveApiClient
    if (!driveClient.googledrive?.api) {
      throw new NonRetriableError(
        "Google Drive Corsair: client.googledrive.api missing. Is @corsair-dev/googledrive registered?",
      )
    }

    // Prefer explicit content; also accept fileContent from prior nodes via template fields
    const content =
      t(config.content as string, context) ||
      t(config.fileContent as string, context)

    const fields: ResolvedDriveFields = {
      operation,
      fileId: t(config.fileId as string, context),
      folderId: t(config.folderId as string, context),
      driveId: t(config.driveId as string, context),
      fileName: t(
        (config.fileName as string) || (config.name as string) || "",
        context,
      ),
      mimeType: t(config.mimeType as string, context),
      content,
      description: t(config.description as string, context),
      parents: t(config.parents as string, context),
      query: t(
        (config.query as string) || (config.q as string) || "",
        context,
      ),
      pageSize:
        tNumber(config.pageSize as string | number | undefined, context) ??
        num(config.pageSize, 50),
      pageToken: t(config.pageToken as string, context),
      orderBy: t(config.orderBy as string, context),
      shareType: t(config.shareType as string, context),
      shareRole: t(config.shareRole as string, context),
      shareEmail: t(
        (config.shareEmail as string) || (config.emailAddress as string) || "",
        context,
      ),
      shareDomain: t(config.shareDomain as string, context),
      addParents: t(config.addParents as string, context),
      removeParents: t(config.removeParents as string, context),
      supportsAllDrives: Boolean(config.supportsAllDrives),
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runGoogleDriveOperation(driveClient, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "Google Drive")
    }

    return {
      ...context,
      [variableName]: {
        operation,
        ...apiResult,
        timestamp: new Date().toISOString(),
      },
    }
  },
}
