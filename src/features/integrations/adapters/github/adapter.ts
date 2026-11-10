/**
 * GitHub Corsair adapter — templates → runGithubOperation → context slice.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t, tNumber } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  runGithubOperation,
  type GithubApiClient,
  type ResolvedGithubFields,
} from "./operations"

function num(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export const githubAdapter: IntegrationAdapter = {
  pluginId: "github",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    // unknown: Node.data JSON boundary
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "USER_GET_CURRENT")
    const variableName = String(config.variableName || "github")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError(
        "GitHub Corsair: missing tenant client. Ensure multi-tenant Corsair is configured.",
      )
    }

    const ghClient = client as GithubApiClient
    if (!ghClient.github?.api) {
      throw new NonRetriableError(
        "GitHub Corsair: client.github.api missing. Is @corsair-dev/github registered?",
      )
    }

    const fields: ResolvedGithubFields = {
      operation,
      owner: t(
        (config.owner as string) || (config.org as string) || "",
        context,
      ),
      repo: t(config.repo as string, context),
      issueNumber: t(
        (config.issueNumber as string) ||
          (config.number as string) ||
          "",
        context,
      ),
      pullNumber: t(
        (config.pullNumber as string) ||
          (config.prNumber as string) ||
          (config.number as string) ||
          "",
        context,
      ),
      title: t(config.title as string, context),
      body: t(
        (config.body as string) || (config.message as string) || "",
        context,
      ),
      state: t(config.state as string, context),
      labels: t(config.labels as string, context),
      assignees: t(config.assignees as string, context),
      path: t(config.path as string, context),
      ref: t(config.ref as string, context),
      branch: t(config.branch as string, context),
      sha: t(config.sha as string, context),
      username: t(
        (config.username as string) || (config.user as string) || "",
        context,
      ),
      userId: t(config.userId as string, context),
      org: t(config.org as string, context),
      commentId: t(config.commentId as string, context),
      releaseId: t(config.releaseId as string, context),
      tagName: t(
        (config.tagName as string) || (config.tag as string) || "",
        context,
      ),
      workflowId: t(config.workflowId as string, context),
      discussionNumber: t(config.discussionNumber as string, context),
      eventType: t(config.eventType as string, context),
      reviewEvent: t(config.reviewEvent as string, context),
      perPage:
        tNumber(config.perPage as string | number | undefined, context) ??
        num(config.perPage, 30),
      page:
        tNumber(config.page as string | number | undefined, context) ??
        num(config.page, 1),
      extraJson: t(config.extraJson as string, context),
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runGithubOperation(ghClient, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "GitHub")
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
