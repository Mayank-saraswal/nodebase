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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2Icon, Github, Copy } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface GitHubTriggerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeId?: string
  workflowId?: string
}

export function GitHubTriggerDialog({
  open,
  onOpenChange,
  nodeId,
  workflowId,
}: GitHubTriggerDialogProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [owner, setOwner] = useState("")
  const [repo, setRepo] = useState("")
  const [events, setEvents] = useState('["push", "pull_request"]')

  const { data: nodeData, isLoading } = useQuery({
    ...trpc.githubTrigger.getByNodeId.queryOptions({ nodeId: nodeId ?? "" }),
    enabled: !!nodeId && open,
  })

  useEffect(() => {
    if (nodeData) {
      setOwner(nodeData.owner || "")
      setRepo(nodeData.repo || "")
      setEvents(nodeData.events || '["push", "pull_request"]')
    }
  }, [nodeData])

  const { mutate: upsertNode, isPending } = useMutation(
    trpc.githubTrigger.upsert.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.githubTrigger.getByNodeId.queryFilter({ nodeId })
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
      owner,
      repo,
      events,
    })
  }

  const handleCopy = (text: string, name: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${name} copied to clipboard`)
  }

  const webhookUrl = typeof window !== "undefined" && nodeData?.webhookId 
    ? `${window.location.origin}/api/webhooks/github/${nodeData.webhookId}`
    : "Save the node to generate a webhook URL."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Trigger
          </DialogTitle>
          <DialogDescription>
            Trigger your workflow when events happen in your GitHub repository.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-4 rounded-md border bg-muted/50 p-4">
              <h4 className="text-sm font-medium">Webhook Configuration</h4>
              <p className="text-xs text-muted-foreground">
                Go to your GitHub repository settings &gt; Webhooks &gt; Add webhook.
                Paste the URL below as the Payload URL, set Content type to application/json, 
                and paste the Secret.
              </p>
              
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input readOnly value={webhookUrl} className="font-mono text-xs bg-background" />
                  <Button variant="outline" size="icon" onClick={() => handleCopy(webhookUrl, "Webhook URL")} disabled={!nodeData?.webhookId}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Secret</Label>
                <div className="flex gap-2">
                  <Input readOnly value={nodeData?.webhookSecret || "Save to generate"} className="font-mono text-xs bg-background" />
                  <Button variant="outline" size="icon" onClick={() => handleCopy(nodeData?.webhookSecret || "", "Secret")} disabled={!nodeData?.webhookSecret}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Events to filter (JSON Array)</Label>
                <Input
                  value={events}
                  onChange={(e) => setEvents(e.target.value)}
                  placeholder='["push", "issues"]'
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  The workflow will only process these GitHub events.
                </p>
              </div>
            </div>

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
