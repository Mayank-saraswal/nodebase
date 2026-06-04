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
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType, GitHubOperation } from "@/generated/prisma"
import { Loader2Icon } from "lucide-react"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"

import { GitHubConfig } from "./types"
import { RepoFields } from "./components/repo-fields"
import { IssueFields } from "./components/issue-fields"
import { WorkflowFields } from "./components/workflow-fields"
import { GenericFields } from "./components/generic-fields"
import { OPERATION_GROUPS, OPERATION_LABELS, getFieldCategory } from "./components/operation-groups"

interface GitHubDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeId?: string
  workflowId?: string
}

export function GitHubDialog({
  open,
  onOpenChange,
  nodeId,
  workflowId,
}: GitHubDialogProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { data: credentials, isLoading: isLoadingCreds } = useCredentialsByType(CredentialType.GITHUB)

  const [values, setValues] = useState<Partial<GitHubConfig>>({
    operation: GitHubOperation.USER_GET_CURRENT,
  })
  const [credentialId, setCredentialId] = useState<string>("")

  const { data: nodeData, isLoading: isLoadingNode } = useQuery({
    ...trpc.github.getByNodeId.queryOptions({ nodeId: nodeId ?? "" }),
    enabled: !!nodeId && open,
  })

  useEffect(() => {
    if (nodeData) {
      setCredentialId(nodeData.credentialId || "")
      setValues({
        operation: nodeData.operation as GitHubOperation,
        owner: nodeData.owner || "",
        repo: nodeData.repo || "",
        branch: nodeData.branch || "",
        filePath: nodeData.filePath || "",
        fileContent: nodeData.fileContent || "",
        commitMessage: nodeData.commitMessage || "",
        issueNumber: nodeData.issueNumber || "",
        pullNumber: nodeData.pullNumber || "",
        title: nodeData.title || "",
        body: nodeData.body || "",
        state: nodeData.state || "",
        labels: nodeData.labels || "",
        assignees: nodeData.assignees || "",
        headBranch: nodeData.headBranch || "",
        baseBranch: nodeData.baseBranch || "",
        workflowId_github: nodeData.workflowId_github || "",
        eventType: nodeData.eventType || "",
        clientPayload: nodeData.clientPayload || "",
        searchQuery: nodeData.searchQuery || "",
        perPage: nodeData.perPage || 30,
        tagName: nodeData.tagName || "",
        releaseName: nodeData.releaseName || "",
        draft: nodeData.draft || false,
        prerelease: nodeData.prerelease || false,
        options: (nodeData.options as Record<string, unknown>) || {},
      })
    } else {
      // Reset form for new/empty nodes so stale state doesn't persist
      setCredentialId("")
      setValues({
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
      })
    }
  }, [nodeData, nodeId])
  const { mutate: upsertNode, isPending } = useMutation(
    trpc.github.upsert.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.github.getByNodeId.queryFilter({ nodeId })
        )
        onOpenChange(false)
      },
    })
  )

  const handleSubmit = () => {
    if (!nodeId || !workflowId) return
    upsertNode({
      nodeId,
      workflowId,
      credentialId: credentialId || undefined,
      ...values,
      operation: values.operation as GitHubOperation,
    })
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src="/logos/github.svg" alt="GitHub" className="h-5 w-5" />
            GitHub Node Configuration
          </DialogTitle>
          <DialogDescription>
            Configure your GitHub integration with over 200 available operations.
          </DialogDescription>
        </DialogHeader>

        {isLoadingNode ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Credential */}
            <div className="space-y-2">
              <label htmlFor="credential-select" className="text-sm font-medium">Credential</label>
              <Select value={credentialId} onValueChange={setCredentialId}>
                <SelectTrigger id="credential-select">
                  <SelectValue placeholder="Select a credential" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingCreds ? (
                    <SelectItem value="loading" disabled>
                      Loading credentials...
                    </SelectItem>
                  ) : credentials?.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No GitHub credentials found
                    </SelectItem>
                  ) : (
                    credentials?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Don&apos;t have a credential?{" "}
                <Link
                  href="/dashboard/credentials"
                  target="_blank"
                  className="text-primary hover:underline"
                >
                  Create one here
                </Link>
              </p>
            </div>

            <Separator />

            {/* Grouped Operation Selector */}
            <div className="space-y-2">
              <label htmlFor="operation-select" className="text-sm font-medium">Operation</label>
              <Select
                value={values.operation}
                onValueChange={(val) => setValues({ ...values, operation: val as GitHubOperation })}
              >
                <SelectTrigger id="operation-select">
                  <SelectValue placeholder="Select operation" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {OPERATION_GROUPS.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground">
                        {group.label}
                      </SelectLabel>
                      {group.ops.map((op) => (
                        <SelectItem key={op} value={op}>
                          {OPERATION_LABELS[op]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selected: <code className="rounded bg-muted px-1 py-0.5">{values.operation}</code>
              </p>
            </div>

            <Separator />

            {/* Dynamic Fields */}
            {renderFields()}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
