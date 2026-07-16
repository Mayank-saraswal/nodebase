/**
 * @deprecated Import from `@/features/integrations/registry` (folder index).
 * Re-export kept for stable paths during Option C migration.
 */
export {
  NODE_TYPE_TO_CORSAIR_PLUGIN,
  getCorsairPluginForNode,
  getIntegrationByTypeKey,
  getIntegrationForNodeType,
  tryResolveNodeOperation,
  listRegisteredIntegrations,
  extractOperation,
  extractVariableName,
  normalizeNodeData,
} from "./registry/index"
