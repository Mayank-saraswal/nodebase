/**
 * Centralized type definitions for all node executors
 * This file provides type-safe interfaces for every node configuration
 * and the NodeExecutor contract used by the Inngest engine.
 *
 * NOTE: Prefer `@/features/executions/types` (this folder) as the single module.
 * Do not add a sibling `types.ts` file — it shadows this package under bundler resolution.
 */

import type { Realtime } from "@inngest/realtime"
import type { GetStepTools, Inngest } from "inngest"
import type { NodeType } from "@/generated/prisma"

// ─────────────────────────────────────────────────────────────
// Base Types
// ─────────────────────────────────────────────────────────────

/**
 * Generic node data with common fields
 */
export interface BaseNodeData {
  nodeId?: string
  variableName?: string
  credentialId?: string | null
  continueOnFail?: boolean
}

/**
 * Node data with workflow relation
 */
export interface NodeDataWithWorkflow extends BaseNodeData {
  workflowId?: string
  workflow?: {
    userId: string
  }
}

// ─────────────────────────────────────────────────────────────
// AI Node Types
// ─────────────────────────────────────────────────────────────

export interface AINodeData extends NodeDataWithWorkflow {
  provider?: string
  model?: string
  operation?: string
  systemPrompt?: string
  userPrompt?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  responseFormat?: string
  jsonSchema?: string
  toolsJson?: string
  toolChoice?: string
  imageUrl?: string
  imageUrls?: string
  imageDetail?: string
  historyKey?: string
  maxHistory?: number
  embeddingInput?: string
  audioUrl?: string
  audioLanguage?: string
  transcriptionFormat?: string
  imagePrompt?: string
  imageSize?: string
  imageQuality?: string
  imageStyle?: string
  imageCount?: number
  classifyLabels?: string
  classifyExamples?: string
  // AI Agent specific
  workflowId?: string
}

// AI Agent data type for the AI agent node
export interface AIAgentData extends AINodeData {
  agentId?: string
  agentName?: string
  agentDescription?: string
  agentInstructions?: string
  agentTools?: string
  agentMemory?: boolean
  agentMaxSteps?: number
}

export type OpenAiData = AINodeData
export type AnthropicData = AINodeData
export type GeminiData = AINodeData
export type GroqData = AINodeData
export type XaiData = AINodeData
export type DeepseekData = AINodeData
export type PerplexityData = AINodeData

// ─────────────────────────────────────────────────────────────
// Communication Node Types
// ─────────────────────────────────────────────────────────────

export interface SlackData extends BaseNodeData {
  operation?: string
  channel?: string
  message?: string
  webhookUrl?: string
  username?: string
  blocks?: string
  attachments?: string
  threadTs?: string
  unfurlLinks?: boolean
  unfurlMedia?: boolean
}

export interface DiscordData extends BaseNodeData {
  webhookUrl?: string
  content?: string
  username?: string
  avatarUrl?: string
  embeds?: string
}

export interface TelegramData extends BaseNodeData {
  botToken?: string
  chatId?: string
  message?: string
  parseMode?: string
  disableNotification?: boolean
  photo?: string
  caption?: string
  document?: string
  content?: string
}

export interface WhatsAppData extends BaseNodeData {
  credentialId?: string
  phoneNumberId?: string
  to?: string
  operation?: string
  message?: string
  templateName?: string
  templateParams?: string
  mediaUrl?: string
  caption?: string
  replyToMessageId?: string
}

export interface Msg91Data extends BaseNodeData {
  credentialId?: string
  operation?: string
  mobile?: string
  message?: string
  senderId?: string
  route?: string
  templateId?: string
  otp?: string
  otpLength?: number
  flowId?: string
  variables?: string
}

// ─────────────────────────────────────────────────────────────
// Email Node Types
// ─────────────────────────────────────────────────────────────

export interface GmailData extends BaseNodeData {
  operation?: string
  to?: string
  from?: string
  subject?: string
  body?: string
  cc?: string
  bcc?: string
  replyTo?: string
  messageId?: string
  threadId?: string
  labelIds?: string
  query?: string
  maxResults?: number
  attachmentId?: string
  filename?: string
}

// ─────────────────────────────────────────────────────────────
// Google Workspace Node Types
// ─────────────────────────────────────────────────────────────

export interface GoogleSheetsData extends BaseNodeData {
  credentialId?: string
  operation?: string
  spreadsheetId?: string
  sheetName?: string
  range?: string
  values?: string
  rowNumber?: number
  query?: string
  majorDimension?: string
  valueInputOption?: string
  insertDataOption?: string
}

export interface GoogleDriveData extends BaseNodeData {
  credentialId?: string
  operation?: string
  folderId?: string
  fileName?: string
  fileId?: string
  fileUrl?: string
  mimeType?: string
  content?: string
  parents?: string
  pageSize?: number
  orderBy?: string
  q?: string
}

// ─────────────────────────────────────────────────────────────
// Payment Node Types
// ─────────────────────────────────────────────────────────────

export interface RazorpayData extends BaseNodeData {
  credentialId?: string
  operation?: string
  amount?: string | number
  currency?: string
  receipt?: string
  paymentId?: string
  orderId?: string
  refundId?: string
  customerId?: string
  name?: string
  email?: string
  contact?: string
  subscriptionId?: string
  invoiceId?: string
  paymentLinkId?: string
  payoutId?: string
  notes?: string
  // Additional fields
  description?: string
  captureAmount?: string | number
  refundAmount?: string | number
  customerName?: string
  customerEmail?: string
  customerContact?: string
  planId?: string
  totalCount?: string | number
  quantity?: string | number
  startAt?: string | number
  invoiceType?: string
  lineItems?: string
  expireBy?: string | number
  referenceId?: string
  callbackUrl?: string
  callbackMethod?: string
  accountNumber?: string
  fundAccountId?: string
  payoutMode?: string
  payoutPurpose?: string
  narration?: string
  signature?: string
  count?: string | number
  skip?: string | number
  fromDate?: string
  toDate?: string
  authorized?: string
  refundSpeed?: string
  partialPayment?: boolean
  failExisting?: boolean
  smsNotify?: boolean
  emailNotify?: boolean
  cancelAtCycleEnd?: boolean
  reminderEnable?: boolean
  queueIfLowBalance?: boolean
  throwOnInvalid?: boolean
}

export interface CashfreeData extends BaseNodeData {
  credentialId?: string
  operation?: string
  orderId?: string
  orderAmount?: number
  orderCurrency?: string
  orderNote?: string
  customerId?: string
  customerEmail?: string
  customerPhone?: string
  paymentId?: string
  refundId?: string
  subscriptionId?: string
  planId?: string
  beneficiaryId?: string
  transferAmount?: number
  // Order fields
  orderMeta?: string
  orderExpiryTime?: string
  orderNotes?: string
  // Payment fields
  cfOrderId?: string
  paymentMethod?: string
  cfPaymentId?: string
  // Refund fields
  refundSpeed?: string
  refundSplits?: string
  // Pagination
  cursor?: string
  limit?: number
  // Date filters
  startDate?: string
  endDate?: string
  // Payment Links
  linkAmount?: number
  linkPurpose?: string
  linkCurrency?: string
  linkNotifyPhone?: string
  linkNotifyEmail?: string
  linkAutoReminders?: boolean
  linkId?: string
  linkDescription?: string
  linkExpiryTime?: string
  linkMinPartialAmount?: number
  // Subscriptions
  subscriptionReturnUrl?: string
  subscriptionNotifyUrl?: string
  subscriptionFirstChargeTime?: string
  subscriptionExpiryTime?: string
  subscriptionAction?: string
  // Plans
  planType?: string
  planIntervals?: number
  planIntervalType?: string
  planMaxAmount?: number
  planMaxCycles?: number
  // Beneficiaries
  beneId?: string
  beneName?: string
  benePhone?: string
  beneEmail?: string
  beneBankAccount?: string
  beneBankIfsc?: string
  beneVpa?: string
  beneAddress?: string
  beneCity?: string
  beneState?: string
  benePincode?: string
  // Transfers
  transferId?: string
  transferMode?: string
  transferRemarks?: string
  batchTransferId?: string
  batchEntries?: string
  upiVpa?: string
  // Offers
  offerMeta?: string
  offerValidations?: string
  offerDetails?: string
  offerId?: string
  // Webhook
  webhookSignature?: string
  webhookTimestamp?: string
  webhookRawBody?: string
  webhookThrowOnFail?: boolean
}

// ─────────────────────────────────────────────────────────────
// Logistics Node Types
// ─────────────────────────────────────────────────────────────

export interface ShiprocketData extends BaseNodeData {
  credentialId?: string
  operation?: string
  orderId?: string
  shipmentId?: string
  awbCode?: string
  pickupLocation?: string
  orderItems?: string
  consigneeName?: string
  consigneePhone?: string
  consigneeAddress?: string
  consigneeCity?: string
  consigneeState?: string
  consigneePincode?: string
  weight?: number
  length?: number
  breadth?: number
  height?: number
}

// ─────────────────────────────────────────────────────────────
// CRM Node Types
// ─────────────────────────────────────────────────────────────

export interface ZohoCrmData extends BaseNodeData {
  operation: string;
  [key: string]: unknown;
}

export interface HubspotData extends BaseNodeData {
  credentialId?: string
  operation?: string
  objectType?: string
  objectId?: string
  properties?: string
  associations?: string
  propertiesToFetch?: string
  searchQuery?: string
  filterGroups?: string
  sorts?: string
  limit?: number
  after?: string
  // Contact fields
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  website?: string
  company?: string
  jobTitle?: string
  lifecycleStage?: string
  leadStatus?: string
  // Company fields
  companyName?: string
  domain?: string
  industry?: string
  annualRevenue?: string
  numberOfEmployees?: string
  // Address
  city?: string
  state?: string
  country?: string
  customProperties?: string
  // Deal fields
  dealName?: string
  dealAmount?: string
  dealStage?: string
  dealPipeline?: string
  dealCloseDate?: string
  dealType?: string
  dealDescription?: string
  // Ticket fields
  ticketSubject?: string
  ticketContent?: string
  ticketPriority?: string
  ticketCategory?: string
  ticketPipeline?: string
  ticketName?: string
  ticketDescription?: string
  ticketStatus?: string
  ticketSource?: string
  // Record operations
  recordId?: string
  // Filtering
  filterProperty?: string
  filterValue?: string
  filterOperator?: string
  // Sorting
  sortProperty?: string
  sortDirection?: string
  // Associations
  toObjectType?: string
  fromObjectType?: string
  fromObjectId?: string
  toObjectId?: string
  associationType?: string
  // Tasks/Calls
  taskDueDate?: string
  callDisposition?: string
  taskSubject?: string
  taskBody?: string
  taskStatus?: string
  taskPriority?: string
  taskType?: string
  callBody?: string
  callDirection?: string
  callDuration?: number
  callStatus?: string
  // Email
  emailFrom?: string
  emailTo?: string
  emailSubject?: string
  emailBody?: string
  noteBody?: string
  listId?: string
  pipeline?: string
  amount?: string
  closeDate?: string
  priority?: string
}

export interface FreshdeskData extends BaseNodeData {
  credentialId?: string
  operation?: string
  ticketId?: string
  contactId?: string
  companyId?: string
  agentId?: string
  subject?: string
  description?: string
  status?: number
  priority?: number
  type?: string
  requesterId?: string
  responderId?: string
  tags?: string
  customFields?: string
}

// ─────────────────────────────────────────────────────────────
// Logic Node Types
// ─────────────────────────────────────────────────────────────

export interface IfElseData extends BaseNodeData {
  conditions?: string
  mode?: string
  combineWith?: string
}

export interface SwitchData extends BaseNodeData {
  field?: string
  cases?: string
  defaultBranch?: string
}

export interface LoopData extends BaseNodeData {
  array?: string
  inputPath?: string
  itemVariable?: string
  maxIterations?: number
}

export interface WaitData extends BaseNodeData {
  duration?: number
  unit?: string
  waitUntil?: string
  waitMode?: string
  durationUnit?: string
  untilDatetime?: string
  timezone?: string
  timeoutDuration?: number
  timeoutUnit?: string
  continueOnTimeout?: boolean
}

export interface MergeData extends BaseNodeData {
  mode?: string
  mergeMode?: string
  key1?: string
  key2?: string
  key3?: string
  key4?: string
  inputCount?: number
  branchKeys?: string
  branchKey1?: string
  branchKey2?: string
  positionFill?: string
  matchKey1?: string
  matchKey2?: string
  waitForAll?: boolean
}

export interface SetVariableData extends BaseNodeData {
  key?: string
  value?: string
  mode?: string
}

export interface CodeData extends BaseNodeData {
  code?: string
  language?: string
  timeout?: number
}

export interface SortData extends BaseNodeData {
  operation?: string
  inputArray?: string
  sortKeys?: string
  outputVariable?: string
}

export interface FilterData extends BaseNodeData {
  inputArray?: string
  conditions?: string
  mode?: string
  maxResults?: number
  keepMatching?: boolean
  keyFilterMode?: string
  stopOnEmpty?: boolean
  includeMetadata?: boolean
  caseSensitive?: boolean
}

export interface AggregateData extends BaseNodeData {
  operation?: string
  operations?: string  // Alternative operation field
  inputArray?: string
  field?: string
  groupBy?: string
  havingConditions?: string
  nullHandling?: string
  inputPath?: string
  countFilter?: string
  percentile?: number
  separator?: string
  topN?: number
  groupByField?: string
  groupAggOps?: string
  sortOutput?: string
  pivotRowField?: string
  pivotColField?: string
  pivotValueField?: string
  pivotValueOp?: string
  multiOps?: string
  roundDecimals?: number
  workflow?: { userId: string }
}

// ─────────────────────────────────────────────────────────────
// Database Node Types
// ─────────────────────────────────────────────────────────────

export interface PostgresData extends BaseNodeData {
  credentialId?: string
  operation?: string
  query?: string
  parameters?: string
  tableName?: string
  columns?: string
  values?: string
  where?: string
  orderBy?: string
  limit?: number
  offset?: number
  joins?: string
  returnData?: boolean
  transactionStatements?: string
  queryParams?: string
  whereConditions?: string
  selectColumns?: string
  schemaName?: string
  limitRows?: number
  offsetRows?: number
  insertData?: string
  insertManyPath?: string
  insertManyColumns?: string
  updateData?: string
  conflictColumns?: string
  updateOnConflict?: boolean
  functionName?: string
  functionArgs?: string
  searchColumn?: string
  searchQuery?: string
  searchLanguage?: string
  searchLimit?: number
  jsonColumn?: string
  jsonPath?: string
  jsonSetColumn?: string
  jsonSetPath?: string
  jsonSetValue?: string
  columnDefinitions?: string
  createTableIfNotExists?: boolean
}

// ─────────────────────────────────────────────────────────────
// Integration Node Types
// ─────────────────────────────────────────────────────────────

export interface HttpRequestData extends BaseNodeData {
  method?: string
  endpoint?: string
  url?: string
  headers?: string
  body?: string
  queryParams?: string
  timeout?: number
  authentication?: string
  followRedirects?: boolean
}

export interface GitHubData extends BaseNodeData {
  credentialId?: string
  operation?: string
  owner?: string
  repo?: string
  path?: string
  branch?: string
  message?: string
  content?: string
  sha?: string
  title?: string
  body?: string
  labels?: string
  assignees?: string
  reviewers?: string
  state?: string
  draft?: boolean
  base?: string
  head?: string
  number?: number
  eventType?: string
  payload?: string
}

export interface NotionData extends BaseNodeData {
  credentialId?: string
  operation?: string
  databaseId?: string
  pageId?: string
  blockId?: string
  properties?: string
  content?: string
  query?: string
  sorts?: string
  filter?: string
  pageSize?: number
  startCursor?: string
  searchQuery?: string
  blockContent?: string
  notionUserId?: string
  filterJson?: string
  sortsJson?: string
  propertiesJson?: string
}

// ─────────────────────────────────────────────────────────────
// Media Node Types
// ─────────────────────────────────────────────────────────────

export interface MediaUploadData extends BaseNodeData {
  source?: string
  url?: string
  base64Data?: string
  fileName?: string
  mimeType?: string
  folder?: string
}

// ─────────────────────────────────────────────────────────────
// Trigger Node Types
// ─────────────────────────────────────────────────────────────

export interface WebhookTriggerData extends BaseNodeData {
  webhookId?: string
  httpMethod?: string
  secretToken?: string
  responseMode?: string
  responseBody?: string
}

export interface ScheduleTriggerData extends BaseNodeData {
  cronExpression?: string
  timezone?: string
  isActive?: boolean
}

export interface RazorpayTriggerData extends BaseNodeData {
  webhookId?: string
  activeEvents?: string[]
  webhookSecret?: string
}

export interface WhatsAppTriggerData extends BaseNodeData {
  webhookId?: string
  phoneNumberId?: string
  activeEvents?: string[]
  verifyToken?: string
}

export interface GitHubTriggerData extends BaseNodeData {
  webhookId?: string
  events?: string[]
  repository?: string
}

export interface StripeTriggerData extends BaseNodeData {
  events?: string[]
}

export interface GoogleFormTriggerData extends BaseNodeData {
  formId?: string
  credentialId?: string
}

export interface ManualTriggerData extends BaseNodeData {
  // Manual trigger has minimal config
}

export interface ErrorTriggerData extends BaseNodeData {
  variableName?: string
}

export interface WorkdayData extends BaseNodeData {
  operation?: string
  endpoint?: string
  tenant?: string
  data?: string
}

// ─────────────────────────────────────────────────────────────
// Type Mapping - Maps NodeType to its data type
// ─────────────────────────────────────────────────────────────

export type NodeDataTypeMap = {
  INITIAL: ManualTriggerData
  MANUAL_TRIGGER: ManualTriggerData
  HTTP_REQUEST: HttpRequestData
  WEBHOOK_TRIGGER: WebhookTriggerData
  SCHEDULE_TRIGGER: ScheduleTriggerData
  STRIPE_TRIGGER: StripeTriggerData
  RAZORPAY_TRIGGER: RazorpayTriggerData
  WHATSAPP_TRIGGER: WhatsAppTriggerData
  GITHUB_TRIGGER: GitHubTriggerData
  GOOGLE_FORM_TRIGGER: GoogleFormTriggerData
  ERROR_TRIGGER: ErrorTriggerData
  
  // AI Nodes
  OPENAI: OpenAiData
  ANTHROPIC: AnthropicData
  GEMINI: GeminiData
  GROQ: GroqData
  XAI: XaiData
  DEEPSEEK: DeepseekData
  PERPLEXITY: PerplexityData
  
  // Communication Nodes
  SLACK: SlackData
  DISCORD: DiscordData
  TELEGRAM: TelegramData
  WHATSAPP: WhatsAppData
  MSG91: Msg91Data
  GMAIL: GmailData
  
  // Google Workspace
  GOOGLE_SHEETS: GoogleSheetsData
  GOOGLE_DRIVE: GoogleDriveData
  
  // Payment Nodes
  RAZORPAY: RazorpayData
  CASHFREE: CashfreeData
  CASHFREE_TRIGGER: CashfreeData
  
  // Logistics Nodes
  SHIPROCKET: ShiprocketData
  
  // CRM Nodes
  ZOHO_CRM: ZohoCrmData
  HUBSPOT: HubspotData
  FRESHDESK: FreshdeskData
  
  // Logic Nodes
  IF_ELSE: IfElseData
  SWITCH: SwitchData
  LOOP: LoopData
  WAIT: WaitData
  MERGE: MergeData
  SET_VARIABLE: SetVariableData
  CODE: CodeData
  SORT: SortData
  FILTER: FilterData
  AGGREGATE: AggregateData
  
  // Database Nodes
  POSTGRES: PostgresData
  
  // Integration Nodes
  NOTION: NotionData
  GITHUB: GitHubData
  MEDIA_UPLOAD: MediaUploadData
  
  // Other
  WORKDAY: WorkdayData
  X: XaiData  // Twitter/X uses similar data structure
}

/**
 * Get the data type for a specific node type
 */
export type GetNodeData<T extends NodeType> = T extends keyof NodeDataTypeMap
  ? NodeDataTypeMap[T]
  : BaseNodeData

// ─────────────────────────────────────────────────────────────
// Executor contract (Inngest graph runtime)
// ─────────────────────────────────────────────────────────────

export type WorkflowContext = Record<string, unknown>

export type StepTools = GetStepTools<Inngest.Any>

export interface WorkflowNode<TData = BaseNodeData> {
  id: string
  type: string
  data?: TData
}

export interface WorkflowConnection {
  id: string
  fromNodeId: string
  toNodeId: string
  fromOutput?: string
  toInput?: string
}

export interface NodeExecutorParams<TData = BaseNodeData> {
  data: TData
  nodeId: string
  credentialId: string | null
  context: WorkflowContext
  step: StepTools
  publish: Realtime.PublishFn
  userId: string
  /** Option C multi-tenant isolation key (Phase A: equals userId) */
  tenantId?: string
  workflowNodes?: WorkflowNode[]
  workflowConnections?: WorkflowConnection[]
}

export type NodeExecutor<TData = BaseNodeData> = (
  params: NodeExecutorParams<TData>,
) => Promise<WorkflowContext>

/**
 * Narrow free-form Node.data / JSON fields without `any`.
 * unknown: value comes from Prisma Json or editor config.
 */
export function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return fallback
}

export function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value
  if (value === "true" || value === 1 || value === "1") return true
  if (value === "false" || value === 0 || value === "0") return false
  return fallback
}

export function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}
