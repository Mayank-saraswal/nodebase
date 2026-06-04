import { GitHubOperation } from "@/generated/prisma";
import { GitHubClient } from "../api-client";
import { GitHubConfig } from "../types";
import { resolveTemplate } from "@/features/executions/lib/template-resolver";
import { NonRetriableError } from "inngest";
/** Safely cast an options value to string (empty string if null/undefined/object). */
const opt = (v: unknown): string => (v != null && typeof v !== "object" ? String(v) : "");



/**
 * Safely parse a JSON string, throwing a NonRetriableError with context on failure.
 */
function safeParseJson<T = unknown>(value: string, fieldName: string): T {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new NonRetriableError(
      `Invalid JSON in ${fieldName}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Handles all Issue, Pull Request, and Discussion operations.
 * Maps to spec sections: 2 (Issue - 14 ops), 3 (PR - 13 ops), 12 (Discussion - 5 ops)
 */
export async function executeIssuesPrsOperations(
  client: GitHubClient,
  config: GitHubConfig,
  resolved: { owner?: string; repo?: string; context: Record<string, unknown> }
): Promise<Record<string, unknown>> {
  const { owner, repo, context } = resolved;
  const issueNumber = resolveTemplate(config.issueNumber || "", context);
  const pullNumber = resolveTemplate(config.pullNumber || "", context);

  switch (config.operation) {
    // ── Issue Operations (14) ──────────────────────────────────────
    case GitHubOperation.ISSUE_CREATE: {
      const body: Record<string, unknown> = {
        title: resolveTemplate(config.title || "", context),
        body: resolveTemplate(config.body || "", context),
      };
      if (config.labels) body.labels = safeParseJson(config.labels, 'labels');
      if (config.assignees) body.assignees = safeParseJson(config.assignees, 'assignees');
      if (config.options?.milestone) {
        const ms = Number.parseInt(String(config.options.milestone), 10);
        if (!Number.isFinite(ms)) throw new NonRetriableError(`Invalid milestone value: ${config.options.milestone}`);
        body.milestone = ms;
      }
      const data = await client.request(`/repos/${owner}/${repo}/issues`, { method: "POST", body });
      return {
        issueId: data.id, issueNumber: data.number,
        url: data.html_url, state: data.state,
        title: data.title, createdAt: data.created_at,
      };
    }

    case GitHubOperation.ISSUE_GET: {
      const data = await client.request(`/repos/${owner}/${repo}/issues/${issueNumber}`);
      return {
        issueId: data.id, issueNumber: data.number,
        url: data.html_url, state: data.state,
        title: data.title, body: data.body,
        user: data.user?.login,
        labels: data.labels?.map((l: any) => ({ name: l.name, color: l.color })),
        assignees: data.assignees?.map((a: any) => a.login),
        commentsCount: data.comments,
        createdAt: data.created_at, updatedAt: data.updated_at,
        closedAt: data.closed_at,
      };
    }

    case GitHubOperation.ISSUE_UPDATE: {
      const body: Record<string, unknown> = {};
      if (config.title) body.title = resolveTemplate(config.title, context);
      if (config.body) body.body = resolveTemplate(config.body, context);
      if (config.state) body.state = config.state;
      if (config.options?.stateReason) body.state_reason = config.options.stateReason;
      if (config.labels) body.labels = safeParseJson(config.labels, 'labels');
      if (config.assignees) body.assignees = safeParseJson(config.assignees, 'assignees');
      if (config.options?.milestone) {
        const ms = Number.parseInt(String(config.options.milestone), 10);
        if (!Number.isFinite(ms)) throw new NonRetriableError(`Invalid milestone value: ${config.options.milestone}`);
        body.milestone = ms;
      }
      const data = await client.request(
        `/repos/${owner}/${repo}/issues/${issueNumber}`,
        { method: "PATCH", body }
      );
      return { issueNumber: data.number, state: data.state, updatedAt: data.updated_at };
    }

    case GitHubOperation.ISSUE_CLOSE: {
      const body: Record<string, unknown> = { state: "closed" };
      if (config.options?.stateReason) body.state_reason = config.options.stateReason;
      const data = await client.request(
        `/repos/${owner}/${repo}/issues/${issueNumber}`,
        { method: "PATCH", body }
      );
      return { issueNumber: data.number, state: data.state, closedAt: data.closed_at };
    }

    case GitHubOperation.ISSUE_REOPEN: {
      const data = await client.request(
        `/repos/${owner}/${repo}/issues/${issueNumber}`,
        { method: "PATCH", body: { state: "open", state_reason: "reopened" } }
      );
      return { issueNumber: data.number, state: data.state };
    }

    case GitHubOperation.ISSUE_LIST: {
      const state = config.state || "open";
      let endpoint = `/repos/${owner}/${repo}/issues?state=${state}&per_page=${config.perPage || 30}`;
      if (config.labels) endpoint += `&labels=${config.labels}`;
      if (config.options?.sort) endpoint += `&sort=${config.options.sort}`;
      if (config.options?.direction) endpoint += `&direction=${config.options.direction}`;
      if (config.options?.since) endpoint += `&since=${config.options.since}`;
      if (config.options?.creator) endpoint += `&creator=${config.options.creator}`;
      if (config.options?.assignee) endpoint += `&assignee=${config.options.assignee}`;
      const data = await client.request(endpoint);
      return {
        issues: Array.isArray(data) ? data.map((i: any) => ({
          id: i.id, number: i.number, title: i.title,
          state: i.state, url: i.html_url, user: i.user?.login,
          labels: i.labels?.map((l: any) => l.name),
          assignees: i.assignees?.map((a: any) => a.login),
          createdAt: i.created_at, updatedAt: i.updated_at,
        })) : [],
        totalCount: Array.isArray(data) ? data.length : 0,
      };
    }

    case GitHubOperation.ISSUE_ADD_LABELS: {
      const labels = config.labels ? safeParseJson<string[]>(config.labels, 'labels') : [];
      const data = await client.request(
        `/repos/${owner}/${repo}/issues/${issueNumber}/labels`,
        { method: "POST", body: { labels } }
      );
      return { labels: data, issueNumber: parseInt(issueNumber) };
    }

    case GitHubOperation.ISSUE_REMOVE_LABEL: {
      const label = resolveTemplate(opt(config.options?.labelName) || "", context);
      await client.request(
        `/repos/${owner}/${repo}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`,
        { method: "DELETE" }
      );
      return { success: true, removedLabel: label };
    }

    case GitHubOperation.ISSUE_CREATE_COMMENT: {
      const data = await client.request(
        `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
        { method: "POST", body: { body: resolveTemplate(config.body || "", context) } }
      );
      return { commentId: data.id, url: data.html_url, createdAt: data.created_at };
    }

    case GitHubOperation.ISSUE_LIST_COMMENTS:
      return client.request(
        `/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=${config.perPage || 30}`
      );

    case GitHubOperation.ISSUE_UPDATE_COMMENT: {
      const commentId = opt(config.options?.commentId);
      const data = await client.request(
        `/repos/${owner}/${repo}/issues/comments/${commentId}`,
        { method: "PATCH", body: { body: resolveTemplate(config.body || "", context) } }
      );
      return { commentId: data.id, updatedAt: data.updated_at };
    }

    case GitHubOperation.ISSUE_DELETE_COMMENT: {
      const commentId = opt(config.options?.commentId);
      await client.request(
        `/repos/${owner}/${repo}/issues/comments/${commentId}`,
        { method: "DELETE" }
      );
      return { success: true };
    }

    case GitHubOperation.ISSUE_ASSIGN: {
      const assignees = config.assignees ? safeParseJson<string[]>(config.assignees, 'assignees') : [];
      return client.request(
        `/repos/${owner}/${repo}/issues/${issueNumber}/assignees`,
        { method: "POST", body: { assignees } }
      );
    }

    case GitHubOperation.ISSUE_UNASSIGN: {
      const assignees = config.assignees ? safeParseJson<string[]>(config.assignees, 'assignees') : [];
      return client.request(
        `/repos/${owner}/${repo}/issues/${issueNumber}/assignees`,
        { method: "DELETE", body: { assignees } }
      );
    }

    // ── Pull Request Operations (13) ───────────────────────────────
    case GitHubOperation.PULL_REQUEST_CREATE: {
      const body: Record<string, unknown> = {
        title: resolveTemplate(config.title || "", context),
        head: resolveTemplate(config.headBranch || "", context),
        base: resolveTemplate(config.baseBranch || "", context),
        body: resolveTemplate(config.body || "", context),
        draft: config.draft ?? false,
      };
      if (config.options?.maintainerCanModify !== undefined)
        body.maintainer_can_modify = config.options.maintainerCanModify;
      const data = await client.request(`/repos/${owner}/${repo}/pulls`, { method: "POST", body });
      return {
        pullRequestId: data.id, pullRequestNumber: data.number,
        url: data.html_url, state: data.state,
        draft: data.draft, createdAt: data.created_at,
      };
    }

    case GitHubOperation.PULL_REQUEST_GET: {
      const data = await client.request(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
      return {
        pullRequestId: data.id, pullRequestNumber: data.number,
        url: data.html_url, state: data.state,
        title: data.title, body: data.body,
        draft: data.draft, merged: data.merged,
        mergeable: data.mergeable,
        user: data.user?.login,
        head: { ref: data.head?.ref, sha: data.head?.sha },
        base: { ref: data.base?.ref, sha: data.base?.sha },
        additions: data.additions, deletions: data.deletions,
        changedFiles: data.changed_files, commitsCount: data.commits,
        createdAt: data.created_at, mergedAt: data.merged_at,
        closedAt: data.closed_at,
      };
    }

    case GitHubOperation.PULL_REQUEST_LIST: {
      const state = config.state || "open";
      let endpoint = `/repos/${owner}/${repo}/pulls?state=${state}&per_page=${config.perPage || 30}`;
      if (config.headBranch) endpoint += `&head=${config.headBranch}`;
      if (config.baseBranch) endpoint += `&base=${config.baseBranch}`;
      if (config.options?.sort) endpoint += `&sort=${config.options.sort}`;
      if (config.options?.direction) endpoint += `&direction=${config.options.direction}`;
      return client.request(endpoint);
    }

    case GitHubOperation.PULL_REQUEST_UPDATE: {
      const body: Record<string, unknown> = {};
      if (config.title) body.title = resolveTemplate(config.title, context);
      if (config.body) body.body = resolveTemplate(config.body, context);
      if (config.state) body.state = config.state;
      if (config.baseBranch) body.base = config.baseBranch;
      return client.request(`/repos/${owner}/${repo}/pulls/${pullNumber}`, { method: "PATCH", body });
    }

    case GitHubOperation.PULL_REQUEST_MERGE: {
      const body: Record<string, unknown> = {};
      if (config.commitMessage) body.commit_message = resolveTemplate(config.commitMessage, context);
      if (config.title) body.commit_title = resolveTemplate(config.title, context);
      if (config.options?.mergeMethod) body.merge_method = config.options.mergeMethod;
      if (config.options?.sha) body.sha = config.options.sha;
      const data = await client.request(
        `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
        { method: "PUT", body }
      );
      return { merged: data.merged, message: data.message, sha: data.sha };
    }

    case GitHubOperation.PULL_REQUEST_CLOSE: {
      const data = await client.request(
        `/repos/${owner}/${repo}/pulls/${pullNumber}`,
        { method: "PATCH", body: { state: "closed" } }
      );
      return { pullRequestNumber: data.number, state: data.state };
    }

    case GitHubOperation.PULL_REQUEST_REOPEN: {
      const data = await client.request(
        `/repos/${owner}/${repo}/pulls/${pullNumber}`,
        { method: "PATCH", body: { state: "open" } }
      );
      return { pullRequestNumber: data.number, state: data.state };
    }

    case GitHubOperation.PULL_REQUEST_LIST_REVIEWS:
      return client.request(`/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`);

    case GitHubOperation.PULL_REQUEST_CREATE_REVIEW: {
      const body: Record<string, unknown> = {
        event: config.options?.event || "COMMENT",
      };
      if (config.body) body.body = resolveTemplate(config.body, context);
      if (config.options?.commitId) body.commit_id = config.options.commitId;
      if (config.options?.comments) body.comments = config.options.comments;
      const data = await client.request(
        `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
        { method: "POST", body }
      );
      return { reviewId: data.id, state: data.state, htmlUrl: data.html_url };
    }

    case GitHubOperation.PULL_REQUEST_REQUEST_REVIEWERS: {
      const body: Record<string, unknown> = {};
      if (config.options?.reviewers) body.reviewers = config.options.reviewers;
      if (config.options?.teamReviewers) body.team_reviewers = config.options.teamReviewers;
      return client.request(
        `/repos/${owner}/${repo}/pulls/${pullNumber}/requested_reviewers`,
        { method: "POST", body }
      );
    }

    case GitHubOperation.PULL_REQUEST_LIST_COMMITS:
      return client.request(`/repos/${owner}/${repo}/pulls/${pullNumber}/commits`);

    case GitHubOperation.PULL_REQUEST_LIST_FILES:
      return client.request(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`);

    case GitHubOperation.PULL_REQUEST_CREATE_REVIEW_COMMENT: {
      const body: Record<string, unknown> = {
        body: resolveTemplate(config.body || "", context),
        commit_id: config.options?.commitId,
        path: config.options?.path,
        position: config.options?.position,
      };
      return client.request(
        `/repos/${owner}/${repo}/pulls/${pullNumber}/comments`,
        { method: "POST", body }
      );
    }

    // ── Discussion Operations (5) ──────────────────────────────────
    case GitHubOperation.DISCUSSION_LIST:
      return client.request(`/repos/${owner}/${repo}/discussions?per_page=${config.perPage || 30}`);

    case GitHubOperation.DISCUSSION_GET:
      return client.request(`/repos/${owner}/${repo}/discussions/${config.options?.discussionNumber}`);

    case GitHubOperation.DISCUSSION_CREATE:
    case GitHubOperation.DISCUSSION_UPDATE:
    case GitHubOperation.DISCUSSION_DELETE:
      // Discussions API is primarily GraphQL-based in GitHub
      throw new NonRetriableError(
        `Discussion mutation operations (${config.operation}) require GitHub GraphQL API. ` +
        `Use the Code node with a GraphQL query for full Discussion support.`
      );

    default:
      throw new NonRetriableError(
        `Unsupported issue/PR/discussion operation: ${config.operation}`
      );
  }
}
