import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { GitHubConfig } from "../types"

interface IssueFieldsProps {
  values: Partial<GitHubConfig>
  setValues: (values: Partial<GitHubConfig>) => void
}

export function IssueFields({ values, setValues }: IssueFieldsProps) {
  const op = values.operation || ""
  const isPR = op.startsWith("PULL_REQUEST_")
  const isDiscussion = op.startsWith("DISCUSSION_")
  const isCreate = op.includes("CREATE")
  const isUpdate = op.includes("UPDATE")
  const needsNumber = op.includes("GET") || isUpdate || op.includes("CLOSE") ||
    op.includes("REOPEN") || op.includes("MERGE") || op.includes("COMMENT") ||
    op.includes("LABEL") || op.includes("ASSIGN") || op.includes("REVIEW") ||
    op.includes("COMMITS") || op.includes("FILES")

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

      {/* Issue Number */}
      {!isPR && !isDiscussion && needsNumber && (
        <div className="space-y-2">
          <Label>Issue Number</Label>
          <Input
            placeholder="e.g. 123"
            value={values.issueNumber || ""}
            onChange={(e) => setValues({ ...values, issueNumber: e.target.value })}
          />
        </div>
      )}

      {/* PR Number */}
      {isPR && needsNumber && (
        <div className="space-y-2">
          <Label>Pull Request Number</Label>
          <Input
            placeholder="e.g. 456"
            value={values.pullNumber || ""}
            onChange={(e) => setValues({ ...values, pullNumber: e.target.value })}
          />
        </div>
      )}

      {/* Title */}
      {(isCreate || isUpdate) && (
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            placeholder={isPR ? "e.g. Add new feature" : "e.g. Fix typo in README"}
            value={values.title || ""}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
          />
        </div>
      )}

      {/* Body */}
      {(isCreate || isUpdate || op.includes("COMMENT")) && (
        <div className="space-y-2">
          <Label>{op.includes("COMMENT") ? "Comment Body" : "Body (Markdown)"}</Label>
          <Textarea
            placeholder="Description..."
            value={values.body || ""}
            onChange={(e) => setValues({ ...values, body: e.target.value })}
            className="min-h-[80px]"
          />
        </div>
      )}

      {/* PR-specific: head/base branches */}
      {isPR && op === "PULL_REQUEST_CREATE" && (
        <>
          <div className="space-y-2">
            <Label>Head Branch</Label>
            <Input
              placeholder="e.g. feature-branch"
              value={values.headBranch || ""}
              onChange={(e) => setValues({ ...values, headBranch: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Base Branch</Label>
            <Input
              placeholder="e.g. main"
              value={values.baseBranch || ""}
              onChange={(e) => setValues({ ...values, baseBranch: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={values.draft ?? false}
              onCheckedChange={(v) => setValues({ ...values, draft: v })}
            />
            <Label>Draft PR</Label>
          </div>
        </>
      )}

      {/* PR merge commit message */}
      {op === "PULL_REQUEST_MERGE" && (
        <div className="space-y-2">
          <Label>Commit Message (optional)</Label>
          <Input
            placeholder="Merge pull request #..."
            value={values.commitMessage || ""}
            onChange={(e) => setValues({ ...values, commitMessage: e.target.value })}
          />
        </div>
      )}

      {/* Labels */}
      {(op === "ISSUE_CREATE" || op === "ISSUE_UPDATE" || op === "ISSUE_ADD_LABELS") && (
        <div className="space-y-2">
          <Label>Labels (JSON array)</Label>
          <Input
            placeholder='["bug", "urgent"]'
            value={values.labels || ""}
            onChange={(e) => setValues({ ...values, labels: e.target.value })}
          />
        </div>
      )}

      {/* Assignees */}
      {(op === "ISSUE_CREATE" || op === "ISSUE_UPDATE" || op === "ISSUE_ASSIGN" || op === "ISSUE_UNASSIGN") && (
        <div className="space-y-2">
          <Label>Assignees (JSON array)</Label>
          <Input
            placeholder='["username1", "username2"]'
            value={values.assignees || ""}
            onChange={(e) => setValues({ ...values, assignees: e.target.value })}
          />
        </div>
      )}

      {/* State for list filtering */}
      {(op === "ISSUE_LIST" || op === "PULL_REQUEST_LIST") && (
        <div className="space-y-2">
          <Label>State Filter</Label>
          <Input
            placeholder="open, closed, or all"
            value={values.state || "open"}
            onChange={(e) => setValues({ ...values, state: e.target.value })}
          />
        </div>
      )}

      {/* Per page */}
      {(op.includes("LIST")) && (
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
