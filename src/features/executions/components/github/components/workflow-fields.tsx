import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { GitHubConfig } from "../types"

interface WorkflowFieldsProps {
  values: Partial<GitHubConfig>
  setValues: (values: Partial<GitHubConfig>) => void
}

export function WorkflowFields({ values, setValues }: WorkflowFieldsProps) {
  const op = values.operation || ""
  const isWorkflow = op.startsWith("WORKFLOW_")
  const isDeployment = op.startsWith("DEPLOYMENT_")
  const isAgentTask = op.startsWith("AGENT_TASK_")
  const isArtifact = op.startsWith("ARTIFACT_")

  // Local string state for the JSON Textarea — preserves partial edits
  const [optionsText, setOptionsText] = useState(
    typeof values.options === "object" ? JSON.stringify(values.options, null, 2) : "{}"
  )

  // Sync optionsText when values.options changes externally (e.g., from DB load)
  useEffect(() => {
    const externalJson = typeof values.options === "object"
      ? JSON.stringify(values.options, null, 2)
      : "{}"
    setOptionsText(externalJson)
  }, [values.options])

  return (
    <div className="space-y-4">
      {/* Owner / Repo */}
      <div className="space-y-2">
        <Label>Owner / Organization</Label>
        <Input
          placeholder="e.g. facebook"
          value={values.owner || ""}
          onChange={(e) => setValues({ ...values, owner: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Repository Name</Label>
        <Input
          placeholder="e.g. react"
          value={values.repo || ""}
          onChange={(e) => setValues({ ...values, repo: e.target.value })}
        />
      </div>

      {/* Workflow dispatch */}
      {op === "WORKFLOW_DISPATCH" && (
        <>
          <div className="space-y-2">
            <Label>Workflow ID or Filename</Label>
            <Input
              placeholder="e.g. build.yml or 12345"
              value={values.workflowId_github || ""}
              onChange={(e) => setValues({ ...values, workflowId_github: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Branch or Tag (Ref)</Label>
            <Input
              placeholder="e.g. main"
              value={values.branch || ""}
              onChange={(e) => setValues({ ...values, branch: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Inputs (JSON)</Label>
            <Textarea
              placeholder='{"key": "value"}'
              value={values.clientPayload || ""}
              onChange={(e) => setValues({ ...values, clientPayload: e.target.value })}
              className="font-mono"
            />
          </div>
        </>
      )}

      {/* Workflow get */}
      {op === "WORKFLOW_GET" && (
        <div className="space-y-2">
          <Label>Workflow ID</Label>
          <Input
            placeholder="e.g. 12345 or deploy.yml"
            value={values.workflowId_github || ""}
            onChange={(e) => setValues({ ...values, workflowId_github: e.target.value })}
          />
        </div>
      )}

      {/* Run list — branch filter */}
      {op === "WORKFLOW_RUN_LIST" && (
        <div className="space-y-2">
          <Label>Branch Filter (optional)</Label>
          <Input
            placeholder="e.g. main"
            value={values.branch || ""}
            onChange={(e) => setValues({ ...values, branch: e.target.value })}
          />
        </div>
      )}

      {/* Deployment create */}
      {op === "DEPLOYMENT_CREATE" && (
        <>
          <div className="space-y-2">
            <Label>Ref (Branch/SHA/Tag)</Label>
            <Input
              placeholder="e.g. main"
              value={values.branch || ""}
              onChange={(e) => setValues({ ...values, branch: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Deploying to production..."
              value={values.body || ""}
              onChange={(e) => setValues({ ...values, body: e.target.value })}
            />
          </div>
        </>
      )}

      {/* Agent task create */}
      {op === "AGENT_TASK_CREATE" && (
        <>
          <div className="space-y-2">
            <Label>Task Title</Label>
            <Input
              placeholder="e.g. Fix the login bug"
              value={values.title || ""}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Detailed task description..."
              value={values.body || ""}
              onChange={(e) => setValues({ ...values, body: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Branch (optional)</Label>
            <Input
              placeholder="e.g. feature-fix"
              value={values.branch || ""}
              onChange={(e) => setValues({ ...values, branch: e.target.value })}
            />
          </div>
        </>
      )}

      {/* Search query for workflow runs */}
      {op.includes("SEARCH") && (
        <div className="space-y-2">
          <Label>Search Query</Label>
          <Input
            placeholder="e.g. user:octocat"
            value={values.searchQuery || ""}
            onChange={(e) => setValues({ ...values, searchQuery: e.target.value })}
          />
        </div>
      )}

      {/* Per page */}
      {op.includes("LIST") && (
        <div className="space-y-2">
          <Label>Results Per Page</Label>
          <Input
            type="number"
            placeholder="30"
            value={values.perPage || 30}
            onChange={(e) => setValues({ ...values, perPage: parseInt(e.target.value) || 30 })}
          />
        </div>
      )}

      {/* Advanced options */}
      {(isDeployment || isAgentTask || isArtifact) && (
        <div className="space-y-2">
          <Label>Advanced Options (JSON)</Label>
          <Textarea
            placeholder='{"environment": "production"}'
            value={optionsText}
            onChange={(e) => {
              setOptionsText(e.target.value)
              try {
                setValues({ ...values, options: JSON.parse(e.target.value) })
              } catch {
                // Allow invalid JSON while typing — local state preserves edits
              }
            }}
            className="font-mono text-xs min-h-[60px]"
          />
        </div>
      )}
    </div>
  )
}
