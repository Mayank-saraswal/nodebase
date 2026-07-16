import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor, WorkflowContext } from "@/features/executions/types"
import { asString } from "@/features/executions/types"
import prisma from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { githubChannel } from "@/inngest/channels/github"
import { GitHubClient } from "./api-client"
import { GitHubNodeData, GitHubConfig } from "./types"
import {
  mapCorsairError,
  resolveTenantId,
} from "@/lib/corsair"
import { tryRunIntegration } from "@/features/integrations/runner"
import { isGithubCorsairOp } from "@/features/integrations/adapters/github/operations"
import { NodeType } from "@/generated/prisma"

// Import modular executors
import { executeRepositoryOperations } from "./executors/repository"
import { executeIssuesPrsOperations } from "./executors/issues-prs"
import { executeWorkflowOperations } from "./executors/workflows"
import { executeUserOrgOperations } from "./executors/users-orgs"
import { executeSearchMiscOperations } from "./executors/search-misc"

export const githubExecutor: NodeExecutor<GitHubNodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
  tenantId: tenantIdParam,
}): Promise<WorkflowContext> => {
  await publish(githubChannel().status({ nodeId, status: "loading" }))

  // unknown: Node.data JSON boundary
  const config = (data ?? {}) as Record<string, unknown>
  const credentialId = asString(config.credentialId)
  const operation = asString(config.operation, "USER_GET_CURRENT")

  if (Object.keys(config).length === 0) {
    await publish(githubChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError(
      "GitHub node not configured. Open settings to configure.",
    )
  }

  // ── Corsair path for ops covered by @corsair-dev/github ──
  if (isGithubCorsairOp(operation)) {
    const tenantId =
      tenantIdParam && tenantIdParam.trim() !== ""
        ? tenantIdParam
        : resolveTenantId({ userId })
    try {
      const corsairResult = await step.run(
        `github-${nodeId}-corsair`,
        async () => {
          return tryRunIntegration({
            nodeType: NodeType.GITHUB,
            data: config,
            context,
            nodeId,
            userId,
            tenantId,
          })
        },
      )
      if (corsairResult) {
        await publish(githubChannel().status({ nodeId, status: "success" }))
        return corsairResult.context
      }
    } catch (error) {
      await publish(githubChannel().status({ nodeId, status: "error" }))
      if (
        error instanceof NonRetriableError ||
        error instanceof RetryAfterError
      ) {
        throw error
      }
      mapCorsairError(error, "GitHub")
    }
  }

  // ── Legacy path (Cryptr + GitHub REST client) ──
  const credential = await step.run(
    `github-${nodeId}-load-credential`,
    async () => {
      if (!credentialId) return null
      return prisma.credential.findUnique({
        where: { id: credentialId, userId },
      })
    },
  )

  if (!credential) {
    await publish(githubChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "GitHub credential required. Add a GITHUB or GITHUB_APP credential."
    );
  }

  let creds: { accessToken: string; baseUrl?: string };
  try {
    creds = JSON.parse(decrypt(credential.value)) as {
      accessToken: string;
      baseUrl?: string;
    };
  } catch (parseError) {
    await publish(githubChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      `Invalid GitHub credential: failed to parse decrypted value for credential ${credential.id}. ` +
      `Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`
    );
  }

  const client = new GitHubClient({
    accessToken: creds.accessToken,
    baseUrl: creds.baseUrl,
  });

  // Execute operation
  let result: Record<string, unknown> = {};
  try {
    result = await step.run(`github-${nodeId}-execute`, async () => {
      // Resolve templates for basic common variables
      const owner = resolveTemplate(asString(config.owner), context)
      const repo = resolveTemplate(asString(config.repo), context)

      // Route to appropriate sub-executor based on operation prefix
      if (
        operation.startsWith("REPOSITORY_") ||
        operation.startsWith("BRANCH_") ||
        operation.startsWith("FILE_") ||
        operation.startsWith("RELEASE_") ||
        operation.startsWith("GIST_")
      ) {
        return executeRepositoryOperations(
          client,
          config as unknown as GitHubConfig,
          { owner, repo, context },
        )
      } else if (
        operation.startsWith("ISSUE_") ||
        operation.startsWith("PULL_REQUEST_") ||
        operation.startsWith("DISCUSSION_")
      ) {
        return executeIssuesPrsOperations(
          client,
          config as unknown as GitHubConfig,
          { owner, repo, context },
        )
      } else if (
        operation.startsWith("WORKFLOW_") || 
        operation.startsWith("AGENT_TASK_") || 
        operation.startsWith("ARTIFACT_") || 
        operation.startsWith("DEPLOYMENT_")
      ) {
        return executeWorkflowOperations(client, config as unknown as GitHubConfig, { owner, repo, context });
      }
      else if (
        operation.startsWith("USER_") || 
        operation.startsWith("ORG_") || 
        operation.startsWith("PACKAGE_") || 
        operation.startsWith("SECRET_") || 
        operation.startsWith("ENVIRONMENT_")
      ) {
        return executeUserOrgOperations(client, config as unknown as GitHubConfig, { owner, repo, context });
      }
      else {
        // Fallback for search, copilot, codespaces, rulesets, projects v2, security, attestations
        return executeSearchMiscOperations(client, config as unknown as GitHubConfig, { owner, repo, context });
      }
    });
  } catch (error) {
    if ((config as unknown as GitHubConfig).continueOnFail) {
      await publish(githubChannel().status({ nodeId, status: "success" }));
      const errorMessage = error instanceof Error ? error.message : String(error);
      const varName = (config as unknown as GitHubConfig).variableName || "github";
      return { ...context, [`${varName}Error`]: errorMessage };
    }

    await publish(githubChannel().status({ nodeId, status: "error" }));
    throw error;
  }

  await publish(githubChannel().status({ nodeId, status: "success" }));
  // Merge context with result so downstream nodes see accumulated data
  const varName = (config as unknown as GitHubConfig).variableName || "github";
  return { ...context, [varName]: result };
};
