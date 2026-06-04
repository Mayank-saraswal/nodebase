import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { GitHubConfig } from "../types"

interface GenericFieldsProps {
  values: Partial<GitHubConfig>
  setValues: (values: Partial<GitHubConfig>) => void
}

export function GenericFields({ values, setValues }: GenericFieldsProps) {
  const op = values.operation || ""

  const isSearch = op.startsWith("SEARCH_")
  const isUser = op.startsWith("USER_")
  const isOrg = op.startsWith("ORG_")
  const needsOwnerRepo = op.startsWith("CODESPACES_") || op.startsWith("RULESET_") ||
    op.startsWith("ENVIRONMENT_") || op.startsWith("SECRET_") ||
    op.startsWith("PACKAGE_") || op.startsWith("ATTESTATION_") ||
    op.startsWith("PROJECT_V2_") || op.startsWith("ADVISORY_")
  const needsOrgOnly = op.startsWith("COPILOT_") || isOrg

  return (
    <div className="space-y-4">
      {/* Owner / Org field — shown for most ops */}
      {(needsOwnerRepo || needsOrgOnly || isUser) && (
        <div className="space-y-2">
          <Label>{needsOrgOnly ? "Organization" : "Owner / Organization"}</Label>
          <Input
            placeholder={needsOrgOnly ? "e.g. my-org" : "e.g. facebook"}
            value={values.owner || ""}
            onChange={(e) => setValues({ ...values, owner: e.target.value })}
          />
        </div>
      )}

      {/* Repo field — for operations that need a repo context */}
      {needsOwnerRepo && (
        <div className="space-y-2">
          <Label>Repository Name</Label>
          <Input
            placeholder="e.g. react"
            value={values.repo || ""}
            onChange={(e) => setValues({ ...values, repo: e.target.value })}
          />
        </div>
      )}

      {/* Search query */}
      {isSearch && (
        <div className="space-y-2">
          <Label>Search Query</Label>
          <Input
            placeholder="e.g. language:typescript stars:>1000"
            value={values.searchQuery || ""}
            onChange={(e) => setValues({ ...values, searchQuery: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Uses GitHub search syntax. See docs for query qualifiers.
          </p>
        </div>
      )}

      {/* Title — for create operations */}
      {(op.includes("CREATE") || op.includes("INVITE") || op.includes("REPORT")) && (
        <div className="space-y-2">
          <Label>Title / Name</Label>
          <Input
            placeholder="e.g. My resource name"
            value={values.title || ""}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
          />
        </div>
      )}

      {/* Body — for create/update operations */}
      {(op.includes("CREATE") || op.includes("UPDATE") || op.includes("REPORT")) && (
        <div className="space-y-2">
          <Label>Description / Body</Label>
          <Textarea
            placeholder="Description..."
            value={values.body || ""}
            onChange={(e) => setValues({ ...values, body: e.target.value })}
          />
        </div>
      )}

      {/* Per page */}
      {(op.includes("LIST") || isSearch) && (
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

      {/* Branch — for codespace create */}
      {op === "CODESPACES_CREATE" && (
        <div className="space-y-2">
          <Label>Branch (ref)</Label>
          <Input
            placeholder="e.g. main"
            value={values.branch || ""}
            onChange={(e) => setValues({ ...values, branch: e.target.value })}
          />
        </div>
      )}

      {/* Options JSON — advanced catch-all for any operation */}
      <div className="space-y-2">
        <Label>Advanced Options (JSON)</Label>
        <Textarea
          placeholder='{"key": "value"}'
          value={typeof values.options === "object" ? JSON.stringify(values.options, null, 2) : "{}"}
          onChange={(e) => {
            try {
              setValues({ ...values, options: JSON.parse(e.target.value) })
            } catch {
              // Allow invalid JSON while typing
            }
          }}
          className="font-mono text-xs min-h-[80px]"
        />
        <p className="text-xs text-muted-foreground">
          Additional parameters for this operation. Refer to the GitHub API docs.
        </p>
      </div>
    </div>
  )
}
