"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCredentialsByTypes } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import { GitHubOperation } from "@/features/executions/enums"
import { Loader2Icon, InfoIcon } from "lucide-react"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import { GitHubConfig } from "./types"
import { RepoFields } from "./components/repo-fields"
import { IssueFields } from "./components/issue-fields"
import { WorkflowFields } from "./components/workflow-fields"
import { GenericFields } from "./components/generic-fields"
import {
  OPERATION_GROUPS,
  OPERATION_LABELS,
  getFieldCategory,
  isCorsairBackedGitHubOp,
} from "./components/operation-groups"

export type GitHubFormValues = Partial<GitHubConfig> & {
  credentialId?: string
}

interface GitHubDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: GitHubFormValues) => void
  defaultValues?: Partial<GitHubFormValues>
  nodeId?: string
  workflowId?: string
}

const EMPTY_VALUES: Partial<GitHubConfig> = {
  operation: GitHubOperation.USER_GET_CURRENT,
  owner: "",
  repo: "",
  branch: "",
  filePath: "",
  fileContent: "",
  commitMessage: "",
  issueNumber: "",
  pullNumber: "",
  title: "",
  body: "",
  state: "",
  labels: "",
  assignees: "",
  headBranch: "",
  baseBranch: "",
  workflowId_github: "",
  eventType: "",
  clientPayload: "",
  searchQuery: "",
  perPage: 30,
  tagName: "",
  releaseName: "",
  draft: false,
  prerelease: false,
  options: {},
  variableName: "github",
  continueOnFail: false,
  username: "",
  path: "",
  commentId: "",
  releaseId: "",
  sha: "",
  ref: "",
  org: "",
}

export function GitHubDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: GitHubDialogProps) {
  const { data: credentials, isLoading: isLoadingCreds } = useCredentialsByTypes([
    CredentialType.GITHUB,
    CredentialType.GITHUB_APP,
  ])

  const [values, setValues] = useState<Partial<GitHubConfig>>({ ...EMPTY_VALUES })
  const [credentialId, setCredentialId] = useState("")
  const [saved, setSaved] = useState(false)

  // Hydrate from canvas node data when dialog opens
  useEffect(() => {
    if (!open) return
    setCredentialId(defaultValues.credentialId || "")
    setValues({
      ...EMPTY_VALUES,
      ...defaultValues,
      operation:
        (defaultValues.operation as GitHubOperation) ||
        GitHubOperation.USER_GET_CURRENT,
      variableName: defaultValues.variableName || "github",
      perPage: defaultValues.perPage ?? 30,
      options:
        typeof defaultValues.options === "object" && defaultValues.options
          ? defaultValues.options
          : {},
    })
    setSaved(false)
  }, [open, defaultValues])

  const handleSubmit = () => {
    const payload: GitHubFormValues = {
      credentialId: credentialId || undefined,
      ...values,
      operation: values.operation as GitHubOperation,
      // Adapter accepts path or filePath
      path: values.path || values.filePath || "",
    }
    onSubmit(payload)
    setSaved(true)
    onOpenChange(false)
  }

  const renderFields = () => {
    const category = getFieldCategory(values.operation || "")
    switch (category) {
      case "repo":
        return <RepoFields values={values} setValues={setValues} />
      case "issues":
        return <IssueFields values={values} setValues={setValues} />
      case "workflows":
        return <WorkflowFields values={values} setValues={setValues} />
      default:
        return <GenericFields values={values} setValues={setValues} />
    }
  }

  const op = values.operation || ""
  const corsairBacked = isCorsairBackedGitHubOp(op)
  const varName = values.variableName || "github"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src="/logos/github.svg" alt="GitHub" className="h-5 w-5" />
            GitHub Node Configuration
          </DialogTitle>
          <DialogDescription>
            Configure GitHub operations. Ops marked{" "}
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              Corsair
            </span>{" "}
            run on the multi-tenant integration backbone when enabled; others use
            the legacy REST path.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Credential */}
          <div className="space-y-2">
            <Label htmlFor="credential-select">Credential</Label>
            <Select value={credentialId} onValueChange={setCredentialId}>
              <SelectTrigger id="credential-select" className="w-full">
                <SelectValue placeholder="Select a credential" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCreds ? (
                  <SelectItem value="loading" disabled>
                    Loading credentials...
                  </SelectItem>
                ) : !credentials?.length ? (
                  <SelectItem value="none" disabled>
                    No GitHub credentials found
                  </SelectItem>
                ) : (
                  credentials.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted">
                          {c.type === "GITHUB_APP" ? "App" : "PAT"}
                        </span>
                        {c.name}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Don&apos;t have a credential?{" "}
              <Link
                href="/credentials"
                target="_blank"
                className="text-primary hover:underline"
              >
                Create one here
              </Link>
            </p>
            {!credentialId && (
              <p className="text-xs text-destructive">Credential is required</p>
            )}
          </div>

          <Separator />

          {/* Operation */}
          <div className="space-y-2">
            <Label htmlFor="operation-select">Operation</Label>
            <Select
              value={values.operation}
              onValueChange={(val) =>
                setValues({ ...values, operation: val as GitHubOperation })
              }
            >
              <SelectTrigger id="operation-select" className="w-full">
                <SelectValue placeholder="Select operation" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {OPERATION_GROUPS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground">
                      {group.label}
                    </SelectLabel>
                    {group.ops.map((opKey) => (
                      <SelectItem key={opKey} value={opKey}>
                        <span className="flex items-center gap-2">
                          {OPERATION_LABELS[opKey]}
                          {isCorsairBackedGitHubOp(opKey) && (
                            <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                              Corsair
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selected:{" "}
              <code className="rounded bg-muted px-1 py-0.5">{op}</code>
              {corsairBacked ? (
                <span className="ml-2 text-emerald-700 dark:text-emerald-400">
                  · runs via Corsair when plugin enabled
                </span>
              ) : (
                <span className="ml-2 text-muted-foreground">
                  · legacy REST path
                </span>
              )}
            </p>
          </div>

          <Separator />

          {/* Dynamic fields */}
          {renderFields()}

          {/* Extra fields commonly needed by Corsair-mapped ops */}
          {(op.startsWith("USER_") && op !== "USER_GET_CURRENT") && (
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                placeholder="octocat or {{prev.login}}"
                value={values.username || ""}
                onChange={(e) =>
                  setValues({ ...values, username: e.target.value })
                }
              />
            </div>
          )}

          {(op.includes("COMMENT") || op === "ISSUE_UPDATE_COMMENT") && (
            <div className="space-y-2">
              <Label>Comment ID</Label>
              <Input
                placeholder="{{github.id}}"
                value={values.commentId || ""}
                onChange={(e) =>
                  setValues({ ...values, commentId: e.target.value })
                }
              />
            </div>
          )}

          {(op.startsWith("RELEASE_") && op !== "RELEASE_CREATE" && op !== "RELEASE_LIST") && (
            <div className="space-y-2">
              <Label>Release ID</Label>
              <Input
                placeholder="123456"
                value={values.releaseId || ""}
                onChange={(e) =>
                  setValues({ ...values, releaseId: e.target.value })
                }
              />
            </div>
          )}

          <Separator />

          {/* Output */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="continueOnFail">Continue On Fail</Label>
                <p className="text-[10px] text-muted-foreground">
                  If enabled, workflow continues on error; error is written to
                  context.
                </p>
              </div>
              <Switch
                id="continueOnFail"
                checked={values.continueOnFail ?? false}
                onCheckedChange={(v) =>
                  setValues({ ...values, continueOnFail: v })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variableName">Output Variable Name</Label>
              <Input
                id="variableName"
                placeholder="github"
                value={values.variableName || ""}
                onChange={(e) =>
                  setValues({ ...values, variableName: e.target.value })
                }
              />
            </div>
          </div>

          <div className="rounded-md border border-blue-100 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex gap-2">
              <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Node output
                </h4>
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-400/90">
                  Results save under{" "}
                  <code className="rounded bg-blue-100 px-1 font-mono dark:bg-blue-900/50">
                    {varName}
                  </code>
                  . Use{" "}
                  <code className="rounded bg-blue-100 px-1 font-mono dark:bg-blue-900/50">
                    {`{{${varName}}}`}
                  </code>{" "}
                  in later nodes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!credentialId.trim()}>
              {saved ? "Saved" : "Save"}
            </Button>
          </div>

          {nodeId && workflowId ? (
            <p className="text-[10px] text-muted-foreground">
              Node {nodeId.slice(0, 8)}… · workflow {workflowId.slice(0, 8)}…
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
