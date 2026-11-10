import type { WorkflowContext } from "@/features/executions/types"
import type { CorsairPluginId } from "@/lib/corsair"

export type AdapterRunParams<TData = Record<string, unknown>> = {
  data: TData
  context: WorkflowContext
  /** Corsair tenant-scoped client (already withTenant'd) */
  client: unknown
  nodeId: string
  userId: string
}

export type IntegrationAdapter<TData = Record<string, unknown>> = {
  pluginId: CorsairPluginId
  run: (params: AdapterRunParams<TData>) => Promise<Record<string, unknown>>
}
