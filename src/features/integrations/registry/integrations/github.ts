/**
 * GitHub registry (Option C).
 * Canonical keys = Corsair paths. Product aliases keep existing workflows running.
 * Ops not listed here stay on the legacy REST executor.
 */

import type { IntegrationDefinition } from "../types"

export const githubIntegrationDefinition: IntegrationDefinition = {
  typeKey: "github",
  kind: "integration",
  corsairPluginId: "github",
  label: "GitHub",
  operations: [
    // issues
    { key: "issues.list", aliases: ["ISSUE_LIST"], label: "List Issues", group: "Issues", risk: "read" },
    { key: "issues.get", aliases: ["ISSUE_GET"], label: "Get Issue", group: "Issues", risk: "read" },
    { key: "issues.create", aliases: ["ISSUE_CREATE"], label: "Create Issue", group: "Issues", risk: "write" },
    { key: "issues.update", aliases: ["ISSUE_UPDATE", "ISSUE_CLOSE", "ISSUE_REOPEN"], label: "Update Issue", group: "Issues", risk: "write" },
    { key: "issues.createComment", aliases: ["ISSUE_CREATE_COMMENT"], label: "Create Issue Comment", group: "Issues", risk: "write" },
    // pull requests
    { key: "pullRequests.list", aliases: ["PULL_REQUEST_LIST"], label: "List Pull Requests", group: "Pull Requests", risk: "read" },
    { key: "pullRequests.get", aliases: ["PULL_REQUEST_GET"], label: "Get Pull Request", group: "Pull Requests", risk: "read" },
    { key: "pullRequests.listReviews", aliases: ["PULL_REQUEST_LIST_REVIEWS"], label: "List PR Reviews", group: "Pull Requests", risk: "read" },
    { key: "pullRequests.createReview", aliases: ["PULL_REQUEST_CREATE_REVIEW"], label: "Create PR Review", group: "Pull Requests", risk: "write" },
    // repositories
    { key: "repositories.list", aliases: ["REPOSITORY_LIST"], label: "List Repositories", group: "Repositories", risk: "read" },
    { key: "repositories.get", aliases: ["REPOSITORY_GET"], label: "Get Repository", group: "Repositories", risk: "read" },
    { key: "repositories.listBranches", aliases: ["BRANCH_LIST"], label: "List Branches", group: "Repositories", risk: "read" },
    { key: "repositories.listCommits", aliases: ["COMMIT_LIST"], label: "List Commits", group: "Repositories", risk: "read" },
    { key: "repositories.getContent", aliases: ["FILE_GET", "FILE_GET_CONTENTS", "FILE_LIST"], label: "Get Content", group: "Repositories", risk: "read" },
    { key: "repositories.star", aliases: ["REPOSITORY_STAR"], label: "Star Repository", group: "Repositories", risk: "write" },
    { key: "repositories.unstar", aliases: ["REPOSITORY_UNSTAR"], label: "Unstar Repository", group: "Repositories", risk: "write" },
    { key: "repositories.checkStarred", aliases: ["REPOSITORY_CHECK_STARRED"], label: "Check Starred", group: "Repositories", risk: "read" },
    { key: "repositories.listStarred", aliases: ["REPOSITORY_LIST_STARRED"], label: "List Starred", group: "Repositories", risk: "read" },
    // releases
    { key: "releases.list", aliases: ["RELEASE_LIST"], label: "List Releases", group: "Releases", risk: "read" },
    { key: "releases.get", aliases: ["RELEASE_GET"], label: "Get Release", group: "Releases", risk: "read" },
    { key: "releases.create", aliases: ["RELEASE_CREATE"], label: "Create Release", group: "Releases", risk: "write" },
    { key: "releases.update", aliases: ["RELEASE_UPDATE"], label: "Update Release", group: "Releases", risk: "write" },
    // workflows
    { key: "workflows.list", aliases: ["WORKFLOW_LIST"], label: "List Workflows", group: "Workflows", risk: "read" },
    { key: "workflows.get", aliases: ["WORKFLOW_GET"], label: "Get Workflow", group: "Workflows", risk: "read" },
    { key: "workflows.listRuns", aliases: ["WORKFLOW_RUN_LIST"], label: "List Workflow Runs", group: "Workflows", risk: "read" },
    // discussions
    { key: "discussions.list", aliases: ["DISCUSSION_LIST"], label: "List Discussions", group: "Discussions", risk: "read" },
    { key: "discussions.get", aliases: ["DISCUSSION_GET"], label: "Get Discussion", group: "Discussions", risk: "read" },
    // forks
    { key: "forks.list", aliases: ["REPOSITORY_LIST_FORKS"], label: "List Forks", group: "Forks", risk: "read" },
    // comments
    { key: "comments.list", aliases: ["COMMENT_LIST"], label: "List Comments", group: "Comments", risk: "read" },
    { key: "comments.listForIssue", aliases: ["ISSUE_LIST_COMMENTS"], label: "List Issue Comments", group: "Comments", risk: "read" },
    { key: "comments.get", aliases: ["COMMENT_GET"], label: "Get Comment", group: "Comments", risk: "read" },
    { key: "comments.update", aliases: ["ISSUE_UPDATE_COMMENT", "COMMENT_UPDATE"], label: "Update Comment", group: "Comments", risk: "write" },
    { key: "comments.delete", aliases: ["ISSUE_DELETE_COMMENT", "COMMENT_DELETE"], label: "Delete Comment", group: "Comments", risk: "destructive" },
    // events
    { key: "events.list", aliases: ["EVENTS_LIST"], label: "List Events", group: "Events", risk: "read" },
    { key: "events.listForRepository", aliases: ["REPOSITORY_LIST_EVENTS"], label: "List Repo Events", group: "Events", risk: "read" },
    { key: "events.listForUser", aliases: ["USER_LIST_EVENTS"], label: "List User Events", group: "Events", risk: "read" },
    { key: "events.listForOrg", aliases: ["ORG_LIST_EVENTS"], label: "List Org Events", group: "Events", risk: "read" },
    { key: "events.listForNetwork", aliases: ["NETWORK_LIST_EVENTS"], label: "List Network Events", group: "Events", risk: "read" },
    { key: "events.listForUserOrg", aliases: ["USER_ORG_LIST_EVENTS"], label: "List User Org Events", group: "Events", risk: "read" },
    { key: "events.listPublicForUser", aliases: ["USER_LIST_PUBLIC_EVENTS"], label: "List Public User Events", group: "Events", risk: "read" },
    { key: "events.listReceivedForUser", aliases: ["USER_LIST_RECEIVED_EVENTS"], label: "List Received Events", group: "Events", risk: "read" },
    { key: "events.listPublicReceivedForUser", aliases: ["USER_LIST_PUBLIC_RECEIVED_EVENTS"], label: "List Public Received Events", group: "Events", risk: "read" },
    // users
    { key: "users.list", aliases: ["USER_LIST"], label: "List Users", group: "Users", risk: "read" },
    { key: "users.get", aliases: ["USER_GET"], label: "Get User", group: "Users", risk: "read" },
    { key: "users.getById", aliases: ["USER_GET_BY_ID"], label: "Get User By ID", group: "Users", risk: "read" },
    { key: "users.getAuthenticated", aliases: ["USER_GET_CURRENT", "USER_GET_AUTHENTICATED"], label: "Get Authenticated User", group: "Users", risk: "read" },
    { key: "users.update", aliases: ["USER_UPDATE"], label: "Update Authenticated User", group: "Users", risk: "write" },
    { key: "users.getHovercard", aliases: ["USER_GET_HOVERCARD"], label: "Get User Hovercard", group: "Users", risk: "read" },
  ],
}
