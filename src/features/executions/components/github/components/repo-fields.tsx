import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { GitHubConfig } from "../types"

interface RepoFieldsProps {
  values: Partial<GitHubConfig>
  setValues: (values: Partial<GitHubConfig>) => void
}

export function RepoFields({ values, setValues }: RepoFieldsProps) {
  const op = values.operation || ""
  const isFile = op.startsWith("FILE_")
  const isBranch = op.startsWith("BRANCH_")
  const isRelease = op.startsWith("RELEASE_")
  const isGist = op.startsWith("GIST_")
  const isCreate = op.includes("CREATE")
  const isUpdate = op.includes("UPDATE")

  return (
    <div className="space-y-4">
      {/* Owner/Repo — not needed for gists or user repo creation */}
      {!isGist && (
        <>
          <div className="space-y-2">
            <Label>Owner / Organization</Label>
            <Input
              placeholder="e.g. facebook"
              value={values.owner || ""}
              onChange={(e) => setValues({ ...values, owner: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">The account owner of the repository. Supports template variables.</p>
          </div>
          <div className="space-y-2">
            <Label>Repository Name</Label>
            <Input
              placeholder="e.g. react"
              value={values.repo || ""}
              onChange={(e) => setValues({ ...values, repo: e.target.value })}
            />
          </div>
        </>
      )}

      {/* Branch field */}
      {(isFile || isBranch) && (
        <div className="space-y-2">
          <Label>Branch</Label>
          <Input
            placeholder="e.g. main"
            value={values.branch || ""}
            onChange={(e) => setValues({ ...values, branch: e.target.value })}
          />
        </div>
      )}

      {/* File path */}
      {isFile && (
        <div className="space-y-2">
          <Label>File Path</Label>
          <Input
            placeholder="e.g. src/index.js"
            value={values.filePath || ""}
            onChange={(e) => setValues({ ...values, filePath: e.target.value })}
          />
        </div>
      )}

      {/* File content + commit message */}
      {isFile && (isCreate || isUpdate || op === "FILE_CREATE_OR_UPDATE") && (
        <>
          <div className="space-y-2">
            <Label>Commit Message</Label>
            <Input
              placeholder="Update index.js"
              value={values.commitMessage || ""}
              onChange={(e) => setValues({ ...values, commitMessage: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>File Content</Label>
            <Textarea
              placeholder="const x = 1;"
              value={values.fileContent || ""}
              onChange={(e) => setValues({ ...values, fileContent: e.target.value })}
              className="font-mono min-h-[100px]"
            />
          </div>
        </>
      )}

      {/* File delete commit message */}
      {op === "FILE_DELETE" && (
        <div className="space-y-2">
          <Label>Commit Message</Label>
          <Input
            placeholder="Delete file"
            value={values.commitMessage || ""}
            onChange={(e) => setValues({ ...values, commitMessage: e.target.value })}
          />
        </div>
      )}

      {/* Release fields */}
      {isRelease && (isCreate || isUpdate) && (
        <>
          <div className="space-y-2">
            <Label>Tag Name</Label>
            <Input
              placeholder="e.g. v1.0.0"
              value={values.tagName || ""}
              onChange={(e) => setValues({ ...values, tagName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Release Name</Label>
            <Input
              placeholder="e.g. Version 1.0.0"
              value={values.releaseName || ""}
              onChange={(e) => setValues({ ...values, releaseName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Release Notes (Markdown)</Label>
            <Textarea
              placeholder="## What's Changed..."
              value={values.body || ""}
              onChange={(e) => setValues({ ...values, body: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={values.draft ?? false}
              onCheckedChange={(v) => setValues({ ...values, draft: v })}
            />
            <Label>Draft</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={values.prerelease ?? false}
              onCheckedChange={(v) => setValues({ ...values, prerelease: v })}
            />
            <Label>Prerelease</Label>
          </div>
        </>
      )}

      {/* Repo create description */}
      {op === "REPOSITORY_CREATE" && (
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            placeholder="Repository description..."
            value={values.body || ""}
            onChange={(e) => setValues({ ...values, body: e.target.value })}
          />
        </div>
      )}

      {/* Repo dispatch */}
      {op === "REPOSITORY_DISPATCH" && (
        <>
          <div className="space-y-2">
            <Label>Event Type</Label>
            <Input
              placeholder="e.g. deploy"
              value={values.eventType || ""}
              onChange={(e) => setValues({ ...values, eventType: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Client Payload (JSON)</Label>
            <Textarea
              placeholder='{"key": "value"}'
              value={values.clientPayload || ""}
              onChange={(e) => setValues({ ...values, clientPayload: e.target.value })}
              className="font-mono"
            />
          </div>
        </>
      )}

      {/* Gist fields */}
      {isGist && (
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            placeholder="Gist description..."
            value={values.body || ""}
            onChange={(e) => setValues({ ...values, body: e.target.value })}
          />
        </div>
      )}

      {/* Per page for list operations */}
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
    </div>
  )
}
