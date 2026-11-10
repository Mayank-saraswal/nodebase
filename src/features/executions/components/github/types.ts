import { GitHubOperation } from "@/features/executions/enums"

export interface GitHubNodeData {
  nodeId?: string;
}

export interface GitHubConfig {
  operation: GitHubOperation
  owner?: string
  repo?: string
  branch?: string
  filePath?: string
  /** Alias used by Corsair adapter (same as filePath) */
  path?: string
  fileContent?: string
  commitMessage?: string
  issueNumber?: string
  pullNumber?: string
  title?: string
  body?: string
  state?: string
  labels?: string
  assignees?: string
  headBranch?: string
  baseBranch?: string
  workflowId_github?: string
  eventType?: string
  clientPayload?: string
  searchQuery?: string
  perPage?: number
  tagName?: string
  releaseName?: string
  draft?: boolean
  prerelease?: boolean
  options?: Record<string, unknown>
  variableName?: string
  continueOnFail?: boolean
  /** Corsair / product extras */
  username?: string
  commentId?: string
  releaseId?: string
  sha?: string
  ref?: string
  org?: string
  credentialId?: string
}
