import { InitialNode } from "@/components/initial-node";
import { HttpRequestNode } from "@/features/executions/components/http-request/node";
import { GoogleFormTrigger } from "@/features/triggers/components/google-form-trigger/node";
import { ManualTriggerNode } from "@/features/triggers/components/manual-trigger/node";
import { NodeType } from "@/generated/prisma";
import type { NodeTypes } from "@xyflow/react";
import { StripeTriggerNode } from "@/features/triggers/components/stripe-trigger/node";
import { WebhookTriggerNode } from "@/features/triggers/components/webhook-trigger/node";
import { ScheduleTriggerNode } from "@/features/triggers/components/schedule-trigger/node";
import { GeminiNode } from "@/features/executions/components/gemini/node";
import { OpenAINode } from "@/features/executions/components/openai/node";
import { AnthropicNode } from "@/features/executions/components/anthropic/node";
import { XAiNode } from "@/features/executions/components/xai/node";
import { DiscordNode } from "@/features/executions/components/discord/node";
import { SlackNode } from "@/features/executions/components/slack/node";
import { DeepseekNode } from "@/features/executions/components/deepseek/node";
import { PerplexityNode } from "@/features/executions/components/perplexity/node";
import { GroqNode } from "@/features/executions/components/groq/node";
import { TelegramNode } from "@/features/executions/components/telegram/node";
import { XNode } from "@/features/executions/components/x/node";
import { WorkdayNode } from "@/features/executions/components/workday/node";
import { IfElseNode } from "@/features/triggers/components/if-else/node";
import { GmailNode } from "@/features/executions/components/gmail/node";
import { SetVariableNode } from "@/features/executions/components/set-variable/node";
import { GoogleSheetsNode } from "@/features/executions/components/google-sheets/node";
import { GoogleDriveNode } from "@/features/executions/components/google-drive/node";
import { WhatsAppNode } from "@/features/executions/components/whatsapp/node";
import { CodeNode } from "@/features/executions/components/code/node";
import { LoopNode } from "@/features/executions/components/loop/node";
import { NotionNode } from "@/features/executions/components/notion/node";
import { RazorpayNode } from "@/features/executions/components/razorpay/node";
import { SwitchNode } from "@/features/executions/components/switch/node";
import { WaitNode } from "@/features/executions/components/wait/node";
import { MergeNode } from "@/features/executions/components/merge/node";
import { ErrorTriggerNode } from "@/features/triggers/components/error-trigger/node";
import { RazorpayTriggerNode } from "@/features/triggers/components/razorpay-trigger/node";
import { WhatsAppTriggerNode } from "@/features/triggers/components/whatsapp-trigger/node";
import { Msg91Node } from "@/features/executions/components/msg91/node";
import { ShiprocketNode } from "@/features/executions/components/shiprocket/node";
import ZohoCrmNode from "@/features/executions/components/zoho-crm/node";
import { HubspotNode } from "@/features/executions/components/hubspot/node";
import { FreshdeskNode } from "@/features/executions/components/freshdesk/node";
import { MediaUploadNode } from "@/features/executions/components/media-upload/node";
import { SortNode } from "@/features/executions/components/sort/node";
import { FilterNode } from "@/features/executions/components/filter/node";
import { CashfreeNode } from "@/features/executions/components/cashfree/node";
import { AggregateNode } from "@/features/executions/components/aggregate/node";
import { PostgresNode } from "@/features/executions/components/postgres/node";
import { GitHubNode } from "@/features/executions/components/github/node";
import { GitHubTriggerNode } from "@/features/triggers/components/github-trigger/node";


export const nodeComponents = {
    [NodeType.INITIAL]: InitialNode,
    [NodeType.HTTP_REQUEST]: HttpRequestNode,
    [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
    [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTrigger,
    [NodeType.STRIPE_TRIGGER]: StripeTriggerNode,
    [NodeType.WEBHOOK_TRIGGER]: WebhookTriggerNode,
    [NodeType.SCHEDULE_TRIGGER]: ScheduleTriggerNode,
    [NodeType.GEMINI]: GeminiNode,
    [NodeType.OPENAI]: OpenAINode,
    [NodeType.ANTHROPIC]: AnthropicNode,
    [NodeType.XAI]: XAiNode,
    [NodeType.DISCORD]: DiscordNode,
    [NodeType.SLACK]: SlackNode,
    [NodeType.DEEPSEEK]: DeepseekNode,
    [NodeType.PERPLEXITY]: PerplexityNode,
    [NodeType.GROQ]: GroqNode,
    [NodeType.TELEGRAM]: TelegramNode,
    [NodeType.X]: XNode,
    [NodeType.WORKDAY]: WorkdayNode,
    [NodeType.IF_ELSE]: IfElseNode,
    [NodeType.GMAIL]: GmailNode,
    [NodeType.SET_VARIABLE]: SetVariableNode,
    [NodeType.GOOGLE_SHEETS]: GoogleSheetsNode,
    [NodeType.GOOGLE_DRIVE]: GoogleDriveNode,
    [NodeType.CODE]: CodeNode,
    [NodeType.WHATSAPP]: WhatsAppNode,
    [NodeType.LOOP]: LoopNode,
    [NodeType.NOTION]: NotionNode,
    [NodeType.RAZORPAY]: RazorpayNode,
    [NodeType.SWITCH]: SwitchNode,
    [NodeType.WAIT]: WaitNode,
    [NodeType.MERGE]: MergeNode,
    [NodeType.ERROR_TRIGGER]: ErrorTriggerNode,
    [NodeType.RAZORPAY_TRIGGER]: RazorpayTriggerNode,
    [NodeType.WHATSAPP_TRIGGER]: WhatsAppTriggerNode,
    [NodeType.MSG91]: Msg91Node,
    [NodeType.SHIPROCKET]: ShiprocketNode,
    [NodeType.ZOHO_CRM]: ZohoCrmNode,
    [NodeType.HUBSPOT]: HubspotNode,
    [NodeType.FRESHDESK]: FreshdeskNode,
    [NodeType.MEDIA_UPLOAD]: MediaUploadNode,
    [NodeType.SORT]: SortNode,
    [NodeType.FILTER]: FilterNode,
    [NodeType.CASHFREE]: CashfreeNode,
    [NodeType.CASHFREE_TRIGGER]: CashfreeNode,
    [NodeType.AGGREGATE]: AggregateNode,
    [NodeType.POSTGRES]: PostgresNode,
    [NodeType.GITHUB]: GitHubNode,
    [NodeType.GITHUB_TRIGGER]: GitHubTriggerNode,
    
    //change later


} as const satisfies NodeTypes;

export type RegisterNodeType = keyof typeof nodeComponents;
