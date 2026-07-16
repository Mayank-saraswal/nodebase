import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  isGithubCorsairOp,
  runGithubOperation,
  type GithubApiClient,
  type ResolvedGithubFields,
} from "../operations"

function fields(
  overrides: Partial<ResolvedGithubFields> = {},
): ResolvedGithubFields {
  return {
    operation: "ISSUE_LIST",
    owner: "octocat",
    repo: "hello-world",
    issueNumber: "",
    pullNumber: "",
    title: "",
    body: "",
    state: "",
    labels: "",
    assignees: "",
    path: "",
    ref: "",
    branch: "",
    sha: "",
    username: "",
    userId: "",
    org: "",
    commentId: "",
    releaseId: "",
    tagName: "",
    workflowId: "",
    discussionNumber: "",
    eventType: "",
    reviewEvent: "",
    perPage: 30,
    page: 1,
    extraJson: "",
    ...overrides,
  }
}

function mockClient(): GithubApiClient {
  return {
    github: {
      api: {
        issues: {
          list: vi.fn().mockResolvedValue([{ number: 1, title: "Bug" }]),
          get: vi.fn().mockResolvedValue({ number: 1, title: "Bug" }),
          create: vi.fn().mockResolvedValue({ number: 2, title: "New" }),
          update: vi.fn().mockResolvedValue({ number: 1, state: "closed" }),
          createComment: vi.fn().mockResolvedValue({ id: 9, body: "ok" }),
        },
        pullRequests: {
          list: vi.fn().mockResolvedValue([{ number: 3 }]),
          get: vi.fn().mockResolvedValue({ number: 3 }),
          listReviews: vi.fn().mockResolvedValue([]),
          createReview: vi.fn().mockResolvedValue({ id: 1 }),
        },
        repositories: {
          list: vi.fn().mockResolvedValue([{ name: "hello-world" }]),
          get: vi.fn().mockResolvedValue({ full_name: "octocat/hello-world" }),
          listBranches: vi.fn().mockResolvedValue([{ name: "main" }]),
          listCommits: vi.fn().mockResolvedValue([{ sha: "abc" }]),
          getContent: vi.fn().mockResolvedValue({ type: "file", name: "README.md" }),
          star: vi.fn().mockResolvedValue(undefined),
          unstar: vi.fn().mockResolvedValue(undefined),
          checkStarred: vi.fn().mockResolvedValue({}),
          listStarred: vi.fn().mockResolvedValue([]),
        },
        releases: {
          list: vi.fn().mockResolvedValue([]),
          get: vi.fn().mockResolvedValue({ id: 1 }),
          create: vi.fn().mockResolvedValue({ id: 2, tag_name: "v1" }),
          update: vi.fn().mockResolvedValue({ id: 1 }),
        },
        workflows: {
          list: vi.fn().mockResolvedValue({ workflows: [] }),
          get: vi.fn().mockResolvedValue({ id: 1 }),
          listRuns: vi.fn().mockResolvedValue({ workflow_runs: [] }),
        },
        discussions: {
          list: vi.fn().mockResolvedValue([]),
          get: vi.fn().mockResolvedValue({ number: 1 }),
        },
        forks: {
          list: vi.fn().mockResolvedValue([]),
        },
        comments: {
          list: vi.fn().mockResolvedValue([]),
          listForIssue: vi.fn().mockResolvedValue([]),
          get: vi.fn().mockResolvedValue({ id: 1 }),
          update: vi.fn().mockResolvedValue({ id: 1 }),
          delete: vi.fn().mockResolvedValue(undefined),
        },
        events: {
          list: vi.fn().mockResolvedValue([]),
          listForNetwork: vi.fn().mockResolvedValue([]),
          listForOrg: vi.fn().mockResolvedValue([]),
          listForRepository: vi.fn().mockResolvedValue([]),
          listForUser: vi.fn().mockResolvedValue([]),
          listForUserOrg: vi.fn().mockResolvedValue([]),
          listPublicForUser: vi.fn().mockResolvedValue([]),
          listReceivedForUser: vi.fn().mockResolvedValue([]),
          listPublicReceivedForUser: vi.fn().mockResolvedValue([]),
        },
        users: {
          list: vi.fn().mockResolvedValue([]),
          get: vi.fn().mockResolvedValue({ login: "octocat" }),
          getById: vi.fn().mockResolvedValue({ login: "octocat" }),
          getAuthenticated: vi.fn().mockResolvedValue({ login: "me" }),
          update: vi.fn().mockResolvedValue({ login: "me" }),
          getHovercard: vi.fn().mockResolvedValue({}),
        },
      },
    },
  }
}

describe("runGithubOperation (Corsair surface)", () => {
  let client: GithubApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("ISSUE_LIST", async () => {
    const out = await runGithubOperation(client, fields())
    expect(client.github.api.issues.list).toHaveBeenCalled()
    expect(out.count).toBe(1)
  })

  it("ISSUE_CREATE requires title", async () => {
    await expect(
      runGithubOperation(
        client,
        fields({ operation: "ISSUE_CREATE", title: "" }),
      ),
    ).rejects.toThrow(/title/)
  })

  it("USER_GET_CURRENT", async () => {
    const out = await runGithubOperation(
      client,
      fields({ operation: "USER_GET_CURRENT" }),
    )
    expect(client.github.api.users.getAuthenticated).toHaveBeenCalled()
    expect(out.operation).toBe("USER_GET_CURRENT")
  })

  it("FILE_GET", async () => {
    await runGithubOperation(
      client,
      fields({ operation: "FILE_GET", path: "README.md" }),
    )
    expect(client.github.api.repositories.getContent).toHaveBeenCalledWith(
      expect.objectContaining({ path: "README.md" }),
    )
  })

  it("accepts Corsair path keys", async () => {
    const out = await runGithubOperation(
      client,
      fields({ operation: "issues.list" }),
    )
    expect(out.operation).toBe("ISSUE_LIST")
  })

  it("isGithubCorsairOp detects mapped ops", () => {
    expect(isGithubCorsairOp("ISSUE_LIST")).toBe(true)
    expect(isGithubCorsairOp("REPOSITORY_CREATE")).toBe(false)
  })

  it("rejects unknown ops", async () => {
    await expect(
      runGithubOperation(client, fields({ operation: "NOT_REAL" })),
    ).rejects.toThrow(/unknown operation/i)
  })

  // ── Edge cases ──

  it("requires owner/repo for repo-scoped ops", async () => {
    await expect(
      runGithubOperation(
        client,
        fields({ operation: "ISSUE_LIST", owner: "", repo: "" }),
      ),
    ).rejects.toThrow(/owner and repo/)
  })

  it("ISSUE_GET requires numeric issueNumber", async () => {
    await expect(
      runGithubOperation(
        client,
        fields({ operation: "ISSUE_GET", issueNumber: "  " }),
      ),
    ).rejects.toThrow(/issueNumber/)
  })

  it("ISSUE_CLOSE maps to state closed", async () => {
    await runGithubOperation(
      client,
      fields({ operation: "ISSUE_CLOSE", issueNumber: "1" }),
    )
    expect(client.github.api.issues.update).toHaveBeenCalledWith(
      expect.objectContaining({ issue_number: 1, state: "closed" }),
    )
  })

  it("ISSUE_REOPEN maps to state open", async () => {
    await runGithubOperation(
      client,
      fields({ operation: "ISSUE_REOPEN", issueNumber: "2" }),
    )
    expect(client.github.api.issues.update).toHaveBeenCalledWith(
      expect.objectContaining({ issue_number: 2, state: "open" }),
    )
  })

  it("ISSUE_CREATE_COMMENT requires body", async () => {
    await expect(
      runGithubOperation(
        client,
        fields({
          operation: "ISSUE_CREATE_COMMENT",
          issueNumber: "1",
          body: "",
        }),
      ),
    ).rejects.toThrow(/body/)
  })

  it("PULL_REQUEST_GET requires pullNumber", async () => {
    await expect(
      runGithubOperation(
        client,
        fields({ operation: "PULL_REQUEST_GET", pullNumber: "" }),
      ),
    ).rejects.toThrow(/pullNumber/)
  })

  it("FILE_GET requires path", async () => {
    await expect(
      runGithubOperation(client, fields({ operation: "FILE_GET", path: "" })),
    ).rejects.toThrow(/path/)
  })

  it("RELEASE_CREATE requires tagName", async () => {
    await expect(
      runGithubOperation(
        client,
        fields({ operation: "RELEASE_CREATE", tagName: "" }),
      ),
    ).rejects.toThrow(/tagName/)
  })

  it("USER_GET requires username", async () => {
    await expect(
      runGithubOperation(
        client,
        fields({ operation: "USER_GET", username: "" }),
      ),
    ).rejects.toThrow(/username/)
  })

  it("COMMENT_DELETE requires commentId", async () => {
    await expect(
      runGithubOperation(
        client,
        fields({ operation: "ISSUE_DELETE_COMMENT", commentId: "" }),
      ),
    ).rejects.toThrow(/commentId/)
  })

  it("whitespace-only owner is rejected", async () => {
    await expect(
      runGithubOperation(
        client,
        fields({ operation: "REPOSITORY_GET", owner: "   ", repo: "x" }),
      ),
    ).rejects.toThrow(/owner and repo/)
  })

  it("ISSUE_CREATE with labels/assignees splits CSV", async () => {
    await runGithubOperation(
      client,
      fields({
        operation: "ISSUE_CREATE",
        title: "T",
        labels: "bug, help wanted",
        assignees: "ada, bob",
      }),
    )
    expect(client.github.api.issues.create).toHaveBeenCalledWith(
      expect.objectContaining({
        labels: ["bug", "help wanted"],
        assignees: ["ada", "bob"],
      }),
    )
  })

  it("WORKFLOW_GET requires workflowId", async () => {
    await expect(
      runGithubOperation(
        client,
        fields({ operation: "WORKFLOW_GET", workflowId: "" }),
      ),
    ).rejects.toThrow(/workflowId/)
  })
})
