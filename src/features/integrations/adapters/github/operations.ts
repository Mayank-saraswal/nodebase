/**
 * GitHub Corsair operations — full @corsair-dev/github public surface.
 * Product aliases resolve via registry; unmapped Nodebase ops stay on legacy path.
 */

import { NonRetriableError } from "inngest"
import { githubIntegrationDefinition } from "@/features/integrations/registry/integrations/github"
import { resolveOperation } from "@/features/integrations/registry/resolve"

export type GithubApiClient = {
  github: {
    api: {
      issues: {
        list: (args: Record<string, unknown>) => Promise<unknown>
        get: (args: Record<string, unknown>) => Promise<unknown>
        create: (args: Record<string, unknown>) => Promise<unknown>
        update: (args: Record<string, unknown>) => Promise<unknown>
        createComment: (args: Record<string, unknown>) => Promise<unknown>
      }
      pullRequests: {
        list: (args: Record<string, unknown>) => Promise<unknown>
        get: (args: Record<string, unknown>) => Promise<unknown>
        listReviews: (args: Record<string, unknown>) => Promise<unknown>
        createReview: (args: Record<string, unknown>) => Promise<unknown>
      }
      repositories: {
        list: (args?: Record<string, unknown>) => Promise<unknown>
        get: (args: Record<string, unknown>) => Promise<unknown>
        listBranches: (args: Record<string, unknown>) => Promise<unknown>
        listCommits: (args: Record<string, unknown>) => Promise<unknown>
        getContent: (args: Record<string, unknown>) => Promise<unknown>
        star: (args: Record<string, unknown>) => Promise<unknown>
        unstar: (args: Record<string, unknown>) => Promise<unknown>
        checkStarred: (args: Record<string, unknown>) => Promise<unknown>
        listStarred: (args?: Record<string, unknown>) => Promise<unknown>
      }
      releases: {
        list: (args: Record<string, unknown>) => Promise<unknown>
        get: (args: Record<string, unknown>) => Promise<unknown>
        create: (args: Record<string, unknown>) => Promise<unknown>
        update: (args: Record<string, unknown>) => Promise<unknown>
      }
      workflows: {
        list: (args: Record<string, unknown>) => Promise<unknown>
        get: (args: Record<string, unknown>) => Promise<unknown>
        listRuns: (args: Record<string, unknown>) => Promise<unknown>
      }
      discussions: {
        list: (args: Record<string, unknown>) => Promise<unknown>
        get: (args: Record<string, unknown>) => Promise<unknown>
      }
      forks: {
        list: (args: Record<string, unknown>) => Promise<unknown>
      }
      comments: {
        list: (args: Record<string, unknown>) => Promise<unknown>
        listForIssue: (args: Record<string, unknown>) => Promise<unknown>
        get: (args: Record<string, unknown>) => Promise<unknown>
        update: (args: Record<string, unknown>) => Promise<unknown>
        delete: (args: Record<string, unknown>) => Promise<unknown>
      }
      events: {
        list: (args?: Record<string, unknown>) => Promise<unknown>
        listForNetwork: (args: Record<string, unknown>) => Promise<unknown>
        listForOrg: (args: Record<string, unknown>) => Promise<unknown>
        listForRepository: (args: Record<string, unknown>) => Promise<unknown>
        listForUser: (args: Record<string, unknown>) => Promise<unknown>
        listForUserOrg: (args: Record<string, unknown>) => Promise<unknown>
        listPublicForUser: (args: Record<string, unknown>) => Promise<unknown>
        listReceivedForUser: (args: Record<string, unknown>) => Promise<unknown>
        listPublicReceivedForUser: (args: Record<string, unknown>) => Promise<unknown>
      }
      users: {
        list: (args?: Record<string, unknown>) => Promise<unknown>
        get: (args: Record<string, unknown>) => Promise<unknown>
        getById: (args: Record<string, unknown>) => Promise<unknown>
        getAuthenticated: (args?: Record<string, unknown>) => Promise<unknown>
        update: (args: Record<string, unknown>) => Promise<unknown>
        getHovercard: (args: Record<string, unknown>) => Promise<unknown>
      }
    }
  }
}

export type ResolvedGithubFields = {
  operation: string
  owner: string
  repo: string
  issueNumber: string
  pullNumber: string
  title: string
  body: string
  state: string
  labels: string
  assignees: string
  path: string
  ref: string
  branch: string
  sha: string
  username: string
  userId: string
  org: string
  commentId: string
  releaseId: string
  tagName: string
  workflowId: string
  discussionNumber: string
  eventType: string
  reviewEvent: string
  perPage: number
  page: number
  /** Free-form JSON for advanced args */
  extraJson: string
}

function asRecord(v: unknown): Record<string, unknown> {
  // unknown: GitHub API JSON
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function requireOwnerRepo(fields: ResolvedGithubFields, op: string) {
  if (!fields.owner.trim() || !fields.repo.trim()) {
    throw new NonRetriableError(
      `GitHub ${op}: owner and repo are required (e.g. octocat / hello-world).`,
    )
  }
}

function num(s: string): number | undefined {
  if (!s.trim()) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

function splitCsv(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
}

function wrap(operation: string, data: unknown): Record<string, unknown> {
  if (Array.isArray(data)) {
    return { operation, items: data, count: data.length, data }
  }
  return { operation, ...asRecord(data), data }
}

/**
 * Returns true when the product op is registered for Corsair (else use legacy).
 */
export function isGithubCorsairOp(operation: string): boolean {
  try {
    resolveOperation(githubIntegrationDefinition, operation)
    return true
  } catch {
    return false
  }
}

function normalizeOp(raw: string): string {
  const { operation, requestedKey } = resolveOperation(
    githubIntegrationDefinition,
    raw,
  )
  if (operation.aliases?.includes(requestedKey)) return requestedKey
  return operation.aliases?.[0] ?? operation.key
}

export async function runGithubOperation(
  client: GithubApiClient,
  fields: ResolvedGithubFields,
): Promise<Record<string, unknown>> {
  const api = client.github.api
  const op = normalizeOp(fields.operation)
  const per_page = fields.perPage || 30
  const page = fields.page || 1

  switch (op) {
    case "ISSUE_LIST":
    case "issues.list": {
      requireOwnerRepo(fields, "ISSUE_LIST")
      const data = await api.issues.list({
        owner: fields.owner,
        repo: fields.repo,
        state: fields.state || "open",
        labels: fields.labels || undefined,
        per_page,
        page,
      })
      return wrap("ISSUE_LIST", data)
    }
    case "ISSUE_GET":
    case "issues.get": {
      requireOwnerRepo(fields, "ISSUE_GET")
      const issue_number = num(fields.issueNumber)
      if (!issue_number) {
        throw new NonRetriableError("GitHub ISSUE_GET: issueNumber is required.")
      }
      const data = await api.issues.get({
        owner: fields.owner,
        repo: fields.repo,
        issue_number,
      })
      return wrap("ISSUE_GET", data)
    }
    case "ISSUE_CREATE":
    case "issues.create": {
      requireOwnerRepo(fields, "ISSUE_CREATE")
      if (!fields.title.trim()) {
        throw new NonRetriableError("GitHub ISSUE_CREATE: title is required.")
      }
      const data = await api.issues.create({
        owner: fields.owner,
        repo: fields.repo,
        title: fields.title,
        body: fields.body || undefined,
        labels: fields.labels ? splitCsv(fields.labels) : undefined,
        assignees: fields.assignees ? splitCsv(fields.assignees) : undefined,
      })
      return wrap("ISSUE_CREATE", data)
    }
    case "ISSUE_UPDATE":
    case "ISSUE_CLOSE":
    case "ISSUE_REOPEN":
    case "issues.update": {
      requireOwnerRepo(fields, "ISSUE_UPDATE")
      const issue_number = num(fields.issueNumber)
      if (!issue_number) {
        throw new NonRetriableError(
          "GitHub ISSUE_UPDATE: issueNumber is required.",
        )
      }
      let state = fields.state || undefined
      if (op === "ISSUE_CLOSE") state = "closed"
      if (op === "ISSUE_REOPEN") state = "open"
      const data = await api.issues.update({
        owner: fields.owner,
        repo: fields.repo,
        issue_number,
        title: fields.title || undefined,
        body: fields.body || undefined,
        state,
        labels: fields.labels ? splitCsv(fields.labels) : undefined,
        assignees: fields.assignees ? splitCsv(fields.assignees) : undefined,
      })
      return wrap(op === "issues.update" ? "ISSUE_UPDATE" : op, data)
    }
    case "ISSUE_CREATE_COMMENT":
    case "issues.createComment": {
      requireOwnerRepo(fields, "ISSUE_CREATE_COMMENT")
      const issue_number = num(fields.issueNumber)
      if (!issue_number || !fields.body.trim()) {
        throw new NonRetriableError(
          "GitHub ISSUE_CREATE_COMMENT: issueNumber and body are required.",
        )
      }
      const data = await api.issues.createComment({
        owner: fields.owner,
        repo: fields.repo,
        issue_number,
        body: fields.body,
      })
      return wrap("ISSUE_CREATE_COMMENT", data)
    }

    case "PULL_REQUEST_LIST":
    case "pullRequests.list": {
      requireOwnerRepo(fields, "PULL_REQUEST_LIST")
      const data = await api.pullRequests.list({
        owner: fields.owner,
        repo: fields.repo,
        state: fields.state || "open",
        per_page,
        page,
      })
      return wrap("PULL_REQUEST_LIST", data)
    }
    case "PULL_REQUEST_GET":
    case "pullRequests.get": {
      requireOwnerRepo(fields, "PULL_REQUEST_GET")
      const pull_number = num(fields.pullNumber)
      if (!pull_number) {
        throw new NonRetriableError(
          "GitHub PULL_REQUEST_GET: pullNumber is required.",
        )
      }
      const data = await api.pullRequests.get({
        owner: fields.owner,
        repo: fields.repo,
        pull_number,
      })
      return wrap("PULL_REQUEST_GET", data)
    }
    case "PULL_REQUEST_LIST_REVIEWS":
    case "pullRequests.listReviews": {
      requireOwnerRepo(fields, "PULL_REQUEST_LIST_REVIEWS")
      const pull_number = num(fields.pullNumber)
      if (!pull_number) {
        throw new NonRetriableError(
          "GitHub PULL_REQUEST_LIST_REVIEWS: pullNumber is required.",
        )
      }
      const data = await api.pullRequests.listReviews({
        owner: fields.owner,
        repo: fields.repo,
        pull_number,
        per_page,
        page,
      })
      return wrap("PULL_REQUEST_LIST_REVIEWS", data)
    }
    case "PULL_REQUEST_CREATE_REVIEW":
    case "pullRequests.createReview": {
      requireOwnerRepo(fields, "PULL_REQUEST_CREATE_REVIEW")
      const pull_number = num(fields.pullNumber)
      if (!pull_number) {
        throw new NonRetriableError(
          "GitHub PULL_REQUEST_CREATE_REVIEW: pullNumber is required.",
        )
      }
      const data = await api.pullRequests.createReview({
        owner: fields.owner,
        repo: fields.repo,
        pull_number,
        body: fields.body || undefined,
        event: fields.reviewEvent || "COMMENT",
      })
      return wrap("PULL_REQUEST_CREATE_REVIEW", data)
    }

    case "REPOSITORY_LIST":
    case "repositories.list": {
      const data = await api.repositories.list({
        per_page,
        page,
        type: fields.state || undefined,
      })
      return wrap("REPOSITORY_LIST", data)
    }
    case "REPOSITORY_GET":
    case "repositories.get": {
      requireOwnerRepo(fields, "REPOSITORY_GET")
      const data = await api.repositories.get({
        owner: fields.owner,
        repo: fields.repo,
      })
      return wrap("REPOSITORY_GET", data)
    }
    case "BRANCH_LIST":
    case "repositories.listBranches": {
      requireOwnerRepo(fields, "BRANCH_LIST")
      const data = await api.repositories.listBranches({
        owner: fields.owner,
        repo: fields.repo,
        per_page,
        page,
      })
      return wrap("BRANCH_LIST", data)
    }
    case "COMMIT_LIST":
    case "repositories.listCommits": {
      requireOwnerRepo(fields, "COMMIT_LIST")
      const data = await api.repositories.listCommits({
        owner: fields.owner,
        repo: fields.repo,
        sha: fields.sha || fields.branch || undefined,
        path: fields.path || undefined,
        per_page,
        page,
      })
      return wrap("COMMIT_LIST", data)
    }
    case "FILE_GET":
    case "FILE_GET_CONTENTS":
    case "FILE_LIST":
    case "repositories.getContent": {
      requireOwnerRepo(fields, "FILE_GET")
      if (!fields.path.trim()) {
        throw new NonRetriableError(
          "GitHub FILE_GET: path is required (file or directory path).",
        )
      }
      const data = await api.repositories.getContent({
        owner: fields.owner,
        repo: fields.repo,
        path: fields.path,
        ref: fields.ref || fields.branch || undefined,
      })
      return wrap("FILE_GET", data)
    }
    case "REPOSITORY_STAR":
    case "repositories.star": {
      requireOwnerRepo(fields, "REPOSITORY_STAR")
      await api.repositories.star({
        owner: fields.owner,
        repo: fields.repo,
      })
      return { operation: "REPOSITORY_STAR", ok: true }
    }
    case "REPOSITORY_UNSTAR":
    case "repositories.unstar": {
      requireOwnerRepo(fields, "REPOSITORY_UNSTAR")
      await api.repositories.unstar({
        owner: fields.owner,
        repo: fields.repo,
      })
      return { operation: "REPOSITORY_UNSTAR", ok: true }
    }
    case "REPOSITORY_CHECK_STARRED":
    case "repositories.checkStarred": {
      requireOwnerRepo(fields, "REPOSITORY_CHECK_STARRED")
      const data = await api.repositories.checkStarred({
        owner: fields.owner,
        repo: fields.repo,
      })
      return wrap("REPOSITORY_CHECK_STARRED", data)
    }
    case "REPOSITORY_LIST_STARRED":
    case "repositories.listStarred": {
      const data = await api.repositories.listStarred({
        per_page,
        page,
      })
      return wrap("REPOSITORY_LIST_STARRED", data)
    }

    case "RELEASE_LIST":
    case "releases.list": {
      requireOwnerRepo(fields, "RELEASE_LIST")
      const data = await api.releases.list({
        owner: fields.owner,
        repo: fields.repo,
        per_page,
        page,
      })
      return wrap("RELEASE_LIST", data)
    }
    case "RELEASE_GET":
    case "releases.get": {
      requireOwnerRepo(fields, "RELEASE_GET")
      const release_id = num(fields.releaseId)
      if (!release_id) {
        throw new NonRetriableError("GitHub RELEASE_GET: releaseId is required.")
      }
      const data = await api.releases.get({
        owner: fields.owner,
        repo: fields.repo,
        release_id,
      })
      return wrap("RELEASE_GET", data)
    }
    case "RELEASE_CREATE":
    case "releases.create": {
      requireOwnerRepo(fields, "RELEASE_CREATE")
      if (!fields.tagName.trim()) {
        throw new NonRetriableError("GitHub RELEASE_CREATE: tagName is required.")
      }
      const data = await api.releases.create({
        owner: fields.owner,
        repo: fields.repo,
        tag_name: fields.tagName,
        name: fields.title || undefined,
        body: fields.body || undefined,
      })
      return wrap("RELEASE_CREATE", data)
    }
    case "RELEASE_UPDATE":
    case "releases.update": {
      requireOwnerRepo(fields, "RELEASE_UPDATE")
      const release_id = num(fields.releaseId)
      if (!release_id) {
        throw new NonRetriableError(
          "GitHub RELEASE_UPDATE: releaseId is required.",
        )
      }
      const data = await api.releases.update({
        owner: fields.owner,
        repo: fields.repo,
        release_id,
        tag_name: fields.tagName || undefined,
        name: fields.title || undefined,
        body: fields.body || undefined,
      })
      return wrap("RELEASE_UPDATE", data)
    }

    case "WORKFLOW_LIST":
    case "workflows.list": {
      requireOwnerRepo(fields, "WORKFLOW_LIST")
      const data = await api.workflows.list({
        owner: fields.owner,
        repo: fields.repo,
        per_page,
        page,
      })
      return wrap("WORKFLOW_LIST", data)
    }
    case "WORKFLOW_GET":
    case "workflows.get": {
      requireOwnerRepo(fields, "WORKFLOW_GET")
      if (!fields.workflowId.trim()) {
        throw new NonRetriableError(
          "GitHub WORKFLOW_GET: workflowId is required.",
        )
      }
      const data = await api.workflows.get({
        owner: fields.owner,
        repo: fields.repo,
        workflow_id: fields.workflowId,
      })
      return wrap("WORKFLOW_GET", data)
    }
    case "WORKFLOW_RUN_LIST":
    case "workflows.listRuns": {
      requireOwnerRepo(fields, "WORKFLOW_RUN_LIST")
      const data = await api.workflows.listRuns({
        owner: fields.owner,
        repo: fields.repo,
        workflow_id: fields.workflowId || undefined,
        per_page,
        page,
      })
      return wrap("WORKFLOW_RUN_LIST", data)
    }

    case "DISCUSSION_LIST":
    case "discussions.list": {
      requireOwnerRepo(fields, "DISCUSSION_LIST")
      const data = await api.discussions.list({
        owner: fields.owner,
        repo: fields.repo,
        per_page,
        page,
      })
      return wrap("DISCUSSION_LIST", data)
    }
    case "DISCUSSION_GET":
    case "discussions.get": {
      requireOwnerRepo(fields, "DISCUSSION_GET")
      const discussion_number = num(fields.discussionNumber)
      if (!discussion_number) {
        throw new NonRetriableError(
          "GitHub DISCUSSION_GET: discussionNumber is required.",
        )
      }
      const data = await api.discussions.get({
        owner: fields.owner,
        repo: fields.repo,
        discussion_number,
      })
      return wrap("DISCUSSION_GET", data)
    }

    case "REPOSITORY_LIST_FORKS":
    case "forks.list": {
      requireOwnerRepo(fields, "REPOSITORY_LIST_FORKS")
      const data = await api.forks.list({
        owner: fields.owner,
        repo: fields.repo,
        per_page,
        page,
      })
      return wrap("REPOSITORY_LIST_FORKS", data)
    }

    case "COMMENT_LIST":
    case "comments.list": {
      requireOwnerRepo(fields, "COMMENT_LIST")
      const data = await api.comments.list({
        owner: fields.owner,
        repo: fields.repo,
        per_page,
        page,
      })
      return wrap("COMMENT_LIST", data)
    }
    case "ISSUE_LIST_COMMENTS":
    case "comments.listForIssue": {
      requireOwnerRepo(fields, "ISSUE_LIST_COMMENTS")
      const issue_number = num(fields.issueNumber)
      if (!issue_number) {
        throw new NonRetriableError(
          "GitHub ISSUE_LIST_COMMENTS: issueNumber is required.",
        )
      }
      const data = await api.comments.listForIssue({
        owner: fields.owner,
        repo: fields.repo,
        issue_number,
        per_page,
        page,
      })
      return wrap("ISSUE_LIST_COMMENTS", data)
    }
    case "COMMENT_GET":
    case "comments.get": {
      requireOwnerRepo(fields, "COMMENT_GET")
      const comment_id = num(fields.commentId)
      if (!comment_id) {
        throw new NonRetriableError("GitHub COMMENT_GET: commentId is required.")
      }
      const data = await api.comments.get({
        owner: fields.owner,
        repo: fields.repo,
        comment_id,
      })
      return wrap("COMMENT_GET", data)
    }
    case "ISSUE_UPDATE_COMMENT":
    case "COMMENT_UPDATE":
    case "comments.update": {
      requireOwnerRepo(fields, "COMMENT_UPDATE")
      const comment_id = num(fields.commentId)
      if (!comment_id || !fields.body.trim()) {
        throw new NonRetriableError(
          "GitHub COMMENT_UPDATE: commentId and body are required.",
        )
      }
      const data = await api.comments.update({
        owner: fields.owner,
        repo: fields.repo,
        comment_id,
        body: fields.body,
      })
      return wrap("COMMENT_UPDATE", data)
    }
    case "ISSUE_DELETE_COMMENT":
    case "COMMENT_DELETE":
    case "comments.delete": {
      requireOwnerRepo(fields, "COMMENT_DELETE")
      const comment_id = num(fields.commentId)
      if (!comment_id) {
        throw new NonRetriableError(
          "GitHub COMMENT_DELETE: commentId is required.",
        )
      }
      await api.comments.delete({
        owner: fields.owner,
        repo: fields.repo,
        comment_id,
      })
      return { operation: "COMMENT_DELETE", ok: true, commentId: comment_id }
    }

    case "EVENTS_LIST":
    case "events.list": {
      const data = await api.events.list({ per_page, page })
      return wrap("EVENTS_LIST", data)
    }
    case "REPOSITORY_LIST_EVENTS":
    case "events.listForRepository": {
      requireOwnerRepo(fields, "REPOSITORY_LIST_EVENTS")
      const data = await api.events.listForRepository({
        owner: fields.owner,
        repo: fields.repo,
        per_page,
        page,
      })
      return wrap("REPOSITORY_LIST_EVENTS", data)
    }
    case "USER_LIST_EVENTS":
    case "events.listForUser": {
      if (!fields.username.trim()) {
        throw new NonRetriableError(
          "GitHub USER_LIST_EVENTS: username is required.",
        )
      }
      const data = await api.events.listForUser({
        username: fields.username,
        per_page,
        page,
      })
      return wrap("USER_LIST_EVENTS", data)
    }
    case "ORG_LIST_EVENTS":
    case "events.listForOrg": {
      if (!fields.org.trim()) {
        throw new NonRetriableError("GitHub ORG_LIST_EVENTS: org is required.")
      }
      const data = await api.events.listForOrg({
        org: fields.org,
        per_page,
        page,
      })
      return wrap("ORG_LIST_EVENTS", data)
    }
    case "NETWORK_LIST_EVENTS":
    case "events.listForNetwork": {
      requireOwnerRepo(fields, "NETWORK_LIST_EVENTS")
      const data = await api.events.listForNetwork({
        owner: fields.owner,
        repo: fields.repo,
        per_page,
        page,
      })
      return wrap("NETWORK_LIST_EVENTS", data)
    }
    case "USER_ORG_LIST_EVENTS":
    case "events.listForUserOrg": {
      if (!fields.username.trim() || !fields.org.trim()) {
        throw new NonRetriableError(
          "GitHub USER_ORG_LIST_EVENTS: username and org are required.",
        )
      }
      const data = await api.events.listForUserOrg({
        username: fields.username,
        org: fields.org,
        per_page,
        page,
      })
      return wrap("USER_ORG_LIST_EVENTS", data)
    }
    case "USER_LIST_PUBLIC_EVENTS":
    case "events.listPublicForUser": {
      if (!fields.username.trim()) {
        throw new NonRetriableError(
          "GitHub USER_LIST_PUBLIC_EVENTS: username is required.",
        )
      }
      const data = await api.events.listPublicForUser({
        username: fields.username,
        per_page,
        page,
      })
      return wrap("USER_LIST_PUBLIC_EVENTS", data)
    }
    case "USER_LIST_RECEIVED_EVENTS":
    case "events.listReceivedForUser": {
      if (!fields.username.trim()) {
        throw new NonRetriableError(
          "GitHub USER_LIST_RECEIVED_EVENTS: username is required.",
        )
      }
      const data = await api.events.listReceivedForUser({
        username: fields.username,
        per_page,
        page,
      })
      return wrap("USER_LIST_RECEIVED_EVENTS", data)
    }
    case "USER_LIST_PUBLIC_RECEIVED_EVENTS":
    case "events.listPublicReceivedForUser": {
      if (!fields.username.trim()) {
        throw new NonRetriableError(
          "GitHub USER_LIST_PUBLIC_RECEIVED_EVENTS: username is required.",
        )
      }
      const data = await api.events.listPublicReceivedForUser({
        username: fields.username,
        per_page,
        page,
      })
      return wrap("USER_LIST_PUBLIC_RECEIVED_EVENTS", data)
    }

    case "USER_LIST":
    case "users.list": {
      const data = await api.users.list({ per_page, page })
      return wrap("USER_LIST", data)
    }
    case "USER_GET":
    case "users.get": {
      if (!fields.username.trim()) {
        throw new NonRetriableError("GitHub USER_GET: username is required.")
      }
      const data = await api.users.get({ username: fields.username })
      return wrap("USER_GET", data)
    }
    case "USER_GET_BY_ID":
    case "users.getById": {
      if (!fields.userId.trim()) {
        throw new NonRetriableError("GitHub USER_GET_BY_ID: userId is required.")
      }
      const data = await api.users.getById({ account_id: fields.userId })
      return wrap("USER_GET_BY_ID", data)
    }
    case "USER_GET_CURRENT":
    case "USER_GET_AUTHENTICATED":
    case "users.getAuthenticated": {
      const data = await api.users.getAuthenticated({})
      return wrap("USER_GET_CURRENT", data)
    }
    case "USER_UPDATE":
    case "users.update": {
      const data = await api.users.update({
        name: fields.title || undefined,
        bio: fields.body || undefined,
      })
      return wrap("USER_UPDATE", data)
    }
    case "USER_GET_HOVERCARD":
    case "users.getHovercard": {
      if (!fields.username.trim()) {
        throw new NonRetriableError(
          "GitHub USER_GET_HOVERCARD: username is required.",
        )
      }
      const data = await api.users.getHovercard({
        username: fields.username,
      })
      return wrap("USER_GET_HOVERCARD", data)
    }

    default:
      throw new NonRetriableError(
        `Unknown GitHub Corsair operation: ${fields.operation} (normalized: ${op}). ` +
          `This product op may only exist on the legacy path.`,
      )
  }
}
