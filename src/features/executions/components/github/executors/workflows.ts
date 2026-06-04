import { GitHubOperation } from "@/generated/prisma";
import { GitHubClient } from "../api-client";
import { GitHubConfig } from "../types";
import { resolveTemplate } from "@/features/executions/lib/template-resolver";
import { NonRetriableError } from "inngest";

/**
 * Handles all Workflow, Agent Task, Artifact, and Deployment operations.
 * Maps to spec sections: 7 (Workflow - 8), 18 (Deployment - 8), 21 (Agent Tasks - 6), 22 (Artifacts - 6)
 */
export async function executeWorkflowOperations(
  client: GitHubClient,
  config: GitHubConfig,
  resolved: { owner?: string; repo?: string; context: Record<string, unknown> }
): Promise<Record<string, unknown>> {
  const { owner, repo, context } = resolved;
  const workflowId = resolveTemplate(config.workflowId_github || "", context);

  switch (config.operation) {
    // ── Workflow Operations (8) ────────────────────────────────────
    case GitHubOperation.WORKFLOW_LIST:
      return client.request(`/repos/${owner}/${repo}/actions/workflows`);

    case GitHubOperation.WORKFLOW_GET:
      return client.request(`/repos/${owner}/${repo}/actions/workflows/${workflowId}`);

    case GitHubOperation.WORKFLOW_DISPATCH: {
      const ref = resolveTemplate(config.branch || "main", context);
      const inputs = config.clientPayload
        ? JSON.parse(resolveTemplate(config.clientPayload, context))
        : {};
      await client.request(
        `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
        { method: "POST", body: { ref, inputs } }
      );
      return { success: true, workflowId, ref };
    }

    case GitHubOperation.WORKFLOW_RUN_LIST: {
      let endpoint = `/repos/${owner}/${repo}/actions/runs?per_page=${config.perPage || 30}`;
      if (config.branch) endpoint += `&branch=${config.branch}`;
      if (config.options?.status) endpoint += `&status=${config.options.status}`;
      if (config.options?.conclusion) endpoint += `&conclusion=${config.options.conclusion}`;
      if (config.options?.event) endpoint += `&event=${config.options.event}`;
      const data = await client.request(endpoint);
      return {
        runs: data.workflow_runs?.map((r: any) => ({
          id: r.id, name: r.name, status: r.status,
          conclusion: r.conclusion, event: r.event,
          headBranch: r.head_branch, headSha: r.head_sha,
          workflowId: r.workflow_id, url: r.html_url,
          createdAt: r.created_at, startedAt: r.run_started_at,
        })) || [],
        totalCount: data.total_count,
      };
    }

    case GitHubOperation.WORKFLOW_RUN_GET: {
      const runId = config.options?.runId;
      return client.request(`/repos/${owner}/${repo}/actions/runs/${runId}`);
    }

    case GitHubOperation.WORKFLOW_RUN_CANCEL: {
      const runId = config.options?.runId;
      await client.request(
        `/repos/${owner}/${repo}/actions/runs/${runId}/cancel`,
        { method: "POST" }
      );
      return { success: true, runId };
    }

    case GitHubOperation.WORKFLOW_RUN_RE_RUN: {
      const runId = config.options?.runId;
      const body: Record<string, unknown> = {};
      if (config.options?.enableDebugLogging) body.enable_debug_logging = true;
      await client.request(
        `/repos/${owner}/${repo}/actions/runs/${runId}/rerun`,
        { method: "POST", body }
      );
      return { success: true, runId };
    }

    case GitHubOperation.WORKFLOW_RUN_LIST_JOBS: {
      const runId = config.options?.runId;
      return client.request(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs`);
    }

    // ── Deployment Operations (8) ──────────────────────────────────
    case GitHubOperation.DEPLOYMENT_LIST:
      return client.request(`/repos/${owner}/${repo}/deployments?per_page=${config.perPage || 30}`);

    case GitHubOperation.DEPLOYMENT_GET: {
      const deploymentId = config.options?.deploymentId;
      return client.request(`/repos/${owner}/${repo}/deployments/${deploymentId}`);
    }

    case GitHubOperation.DEPLOYMENT_CREATE: {
      const body: Record<string, unknown> = {
        ref: resolveTemplate(config.branch || "", context),
        environment: config.options?.environment || "production",
        description: resolveTemplate(config.body || "", context),
      };
      if (config.options?.task) body.task = config.options.task;
      if (config.options?.autoMerge !== undefined) body.auto_merge = config.options.autoMerge;
      if (config.options?.requiredContexts) body.required_contexts = config.options.requiredContexts;
      if (config.options?.payload) body.payload = config.options.payload;
      if (config.options?.productionEnvironment !== undefined) body.production_environment = config.options.productionEnvironment;
      const data = await client.request(`/repos/${owner}/${repo}/deployments`, { method: "POST", body });
      return {
        deploymentId: data.id, url: data.url, sha: data.sha,
        ref: data.ref, task: data.task, environment: data.environment,
        description: data.description, createdAt: data.created_at,
      };
    }

    case GitHubOperation.DEPLOYMENT_LIST_STATUSES: {
      const deploymentId = config.options?.deploymentId;
      return client.request(`/repos/${owner}/${repo}/deployments/${deploymentId}/statuses`);
    }

    case GitHubOperation.DEPLOYMENT_GET_STATUS: {
      const deploymentId = config.options?.deploymentId;
      const statusId = config.options?.statusId;
      return client.request(`/repos/${owner}/${repo}/deployments/${deploymentId}/statuses/${statusId}`);
    }

    case GitHubOperation.DEPLOYMENT_CREATE_STATUS:
    case GitHubOperation.DEPLOYMENT_SET_STATUS: {
      const deploymentId = config.options?.deploymentId;
      const body: Record<string, unknown> = {
        state: config.state || "success",
      };
      if (config.options?.logUrl) body.log_url = config.options.logUrl;
      if (config.options?.environmentUrl) body.environment_url = config.options.environmentUrl;
      if (config.body) body.description = resolveTemplate(config.body, context);
      if (config.options?.environment) body.environment = config.options.environment;
      if (config.options?.autoInactive !== undefined) body.auto_inactive = config.options.autoInactive;
      return client.request(
        `/repos/${owner}/${repo}/deployments/${deploymentId}/statuses`,
        { method: "POST", body }
      );
    }

    case GitHubOperation.DEPLOYMENT_DELETE: {
      const deploymentId = config.options?.deploymentId;
      await client.request(`/repos/${owner}/${repo}/deployments/${deploymentId}`, { method: "DELETE" });
      return { success: true };
    }

    // ── Agent Task Operations (6) ──────────────────────────────────
    case GitHubOperation.AGENT_TASK_LIST: {
      let endpoint = `/repos/${owner}/${repo}/agent-tasks?per_page=${config.perPage || 30}`;
      if (config.state) endpoint += `&state=${config.state}`;
      return client.request(endpoint);
    }

    case GitHubOperation.AGENT_TASK_GET: {
      const taskId = config.options?.taskId;
      return client.request(`/repos/${owner}/${repo}/agent-tasks/${taskId}`);
    }

    case GitHubOperation.AGENT_TASK_CREATE: {
      const body: Record<string, unknown> = {
        title: resolveTemplate(config.title || "", context),
      };
      if (config.body) body.description = resolveTemplate(config.body, context);
      if (config.branch) body.branch = config.branch;
      if (config.baseBranch) body.base_branch = config.baseBranch;
      return client.request(`/repos/${owner}/${repo}/agent-tasks`, { method: "POST", body });
    }

    case GitHubOperation.AGENT_TASK_UPDATE: {
      const taskId = config.options?.taskId;
      const body: Record<string, unknown> = {};
      if (config.title) body.title = resolveTemplate(config.title, context);
      if (config.body) body.description = resolveTemplate(config.body, context);
      return client.request(`/repos/${owner}/${repo}/agent-tasks/${taskId}`, { method: "PATCH", body });
    }

    case GitHubOperation.AGENT_TASK_CANCEL: {
      const taskId = config.options?.taskId;
      await client.request(`/repos/${owner}/${repo}/agent-tasks/${taskId}/cancel`, { method: "POST" });
      return { success: true, taskId };
    }

    case GitHubOperation.AGENT_TASK_GET_LOGS: {
      const taskId = config.options?.taskId;
      return client.request(`/repos/${owner}/${repo}/agent-tasks/${taskId}/logs`);
    }

    // ── Artifact Operations (6) ────────────────────────────────────
    case GitHubOperation.ARTIFACT_LIST: {
      let endpoint = `/repos/${owner}/${repo}/actions/artifacts?per_page=${config.perPage || 30}`;
      if (config.options?.name) endpoint += `&name=${encodeURIComponent(config.options.name)}`;
      const data = await client.request(endpoint);
      return {
        artifacts: data.artifacts?.map((a: any) => ({
          id: a.id, name: a.name, sizeInBytes: a.size_in_bytes,
          expired: a.expired, createdAt: a.created_at,
          updatedAt: a.updated_at, expiresAt: a.expires_at,
          workflowRunId: a.workflow_run?.id,
        })) || [],
        totalCount: data.total_count,
      };
    }

    case GitHubOperation.ARTIFACT_GET: {
      const artifactId = config.options?.artifactId;
      return client.request(`/repos/${owner}/${repo}/actions/artifacts/${artifactId}`);
    }

    case GitHubOperation.ARTIFACT_DELETE: {
      const artifactId = config.options?.artifactId;
      await client.request(`/repos/${owner}/${repo}/actions/artifacts/${artifactId}`, { method: "DELETE" });
      return { success: true };
    }

    case GitHubOperation.ARTIFACT_DOWNLOAD: {
      const artifactId = config.options?.artifactId;
      return client.request(`/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`);
    }

    case GitHubOperation.ARTIFACT_UPLOAD:
      throw new NonRetriableError("ARTIFACT_UPLOAD requires the Actions runtime upload mechanism and cannot be done via REST.");

    case GitHubOperation.ARTIFACT_GET_ARCHIVE_URL: {
      const artifactId = config.options?.artifactId;
      return client.request(`/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`);
    }

    default:
      throw new NonRetriableError(
        `Unsupported workflow/deployment/agent/artifact operation: ${config.operation}`
      );
  }
}
