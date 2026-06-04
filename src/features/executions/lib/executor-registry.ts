import { NodeType } from "@/generated/prisma";
import { NodeExecutor } from "../types";
import { manualTriggerExecutor } from "@/features/triggers/components/manual-trigger/executor";
import { httpRequestExecutor } from "../components/http-request/executor";
import { googleFormTriggerExecutor } from "@/features/triggers/components/google-form-trigger/executor";
import { stripeTriggerExecutor } from "@/features/triggers/components/stripe-trigger/executor";
import { webhookTriggerExecutor } from "@/features/triggers/components/webhook-trigger/executor";
import { scheduleTriggerExecutor } from "@/features/triggers/components/schedule-trigger/executor";
import { discordExecutor } from "../components/discord/executor";
import { slackExecutor } from "../components/slack/executor";
import { aiExecutor } from "../components/ai/executor";
import { telegramExecutor } from "../components/telegram/executor";
import { xExecutor } from "../components/x/executor";
import { workdayExecutor } from "../components/workday/executor";
import { ifElseExecutor } from "@/features/triggers/components/if-else/executor";
import { gmailExecutor } from "../components/gmail/executor";
import { setVariableExecutor } from "../components/set-variable/executor";
import { googleSheetsExecutor } from "../components/google-sheets/executor";
import { googleDriveExecutor } from "../components/google-drive/executor";
import { whatsappExecutor } from "../components/whatsapp/executor";
import { codeExecutor } from "../components/code/executor";
import { loopExecutor } from "../components/loop/executor";
import { notionExecutor } from "../components/notion/executor";
import { razorpayExecutor } from "../components/razorpay/executor";
import { switchExecutor } from "../components/switch/executor";
import { waitExecutor } from "../components/wait/executor";
import { mergeExecutor } from "../components/merge/executor";
import { errorTriggerExecutor } from "../components/error-trigger/executor";
import { razorpayTriggerExecutor } from "@/features/triggers/components/razorpay-trigger/executor";
import { whatsappTriggerExecutor } from "@/features/triggers/components/whatsapp-trigger/executor";
import { msg91Executor } from "../components/msg91/executor";
import { shiprocketExecutor } from "../components/shiprocket/executor";
import { zohoCrmExecutor } from "../components/zoho-crm/executor";
import { hubspotExecutor } from "../components/hubspot/executor";
import { freshdeskExecutor } from "../components/freshdesk/executor";
import { mediaUploadExecutor } from "../components/media-upload/executor";
import { sortExecutor } from "../components/sort/executor";
import { filterExecutor } from "../components/filter/executor";
import { cashfreeExecutor } from "../components/cashfree/executor";
import { aggregateExecutor } from "../components/aggregate/executor";
import { postgresExecutor } from "../components/postgres/executor";
import { githubExecutor } from "../components/github/executor";
import { githubTriggerExecutor } from "@/features/triggers/components/github-trigger/executor";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
    [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
    [NodeType.HTTP_REQUEST]: httpRequestExecutor,
    [NodeType.INITIAL]: manualTriggerExecutor,
    [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
    [NodeType.STRIPE_TRIGGER]: stripeTriggerExecutor,
    [NodeType.WEBHOOK_TRIGGER]: webhookTriggerExecutor,
    [NodeType.SCHEDULE_TRIGGER]: scheduleTriggerExecutor,
    [NodeType.GEMINI]: aiExecutor,
    [NodeType.ANTHROPIC]: aiExecutor,
    [NodeType.OPENAI]: aiExecutor,
    [NodeType.XAI]: aiExecutor,
    [NodeType.DISCORD]: discordExecutor,
    [NodeType.SLACK]: slackExecutor,
    [NodeType.PERPLEXITY]: aiExecutor,
    [NodeType.DEEPSEEK]: aiExecutor,
    [NodeType.GROQ]: aiExecutor,
    [NodeType.TELEGRAM]: telegramExecutor,
    [NodeType.X]: xExecutor,
    [NodeType.WORKDAY]: workdayExecutor,
    [NodeType.IF_ELSE]: ifElseExecutor,
    [NodeType.GMAIL]: gmailExecutor,
    [NodeType.SET_VARIABLE]: setVariableExecutor,
    [NodeType.GOOGLE_SHEETS]: googleSheetsExecutor,
    [NodeType.GOOGLE_DRIVE]: googleDriveExecutor,
    [NodeType.CODE]: codeExecutor,
    [NodeType.WHATSAPP]: whatsappExecutor,
    [NodeType.LOOP]: loopExecutor,
    [NodeType.NOTION]: notionExecutor,
    [NodeType.RAZORPAY]: razorpayExecutor,
    [NodeType.SWITCH]: switchExecutor,
    [NodeType.WAIT]: waitExecutor,
    [NodeType.MERGE]: mergeExecutor,
    [NodeType.ERROR_TRIGGER]: errorTriggerExecutor,
    [NodeType.RAZORPAY_TRIGGER]: razorpayTriggerExecutor,
    [NodeType.WHATSAPP_TRIGGER]: whatsappTriggerExecutor,
    [NodeType.MSG91]: msg91Executor,
    [NodeType.SHIPROCKET]: shiprocketExecutor,
    [NodeType.ZOHO_CRM]: zohoCrmExecutor,
    [NodeType.HUBSPOT]: hubspotExecutor,
    [NodeType.FRESHDESK]: freshdeskExecutor,
    [NodeType.MEDIA_UPLOAD]: mediaUploadExecutor,
    [NodeType.SORT]: sortExecutor,
    [NodeType.FILTER]: filterExecutor,
    [NodeType.CASHFREE]: cashfreeExecutor,
    [NodeType.CASHFREE_TRIGGER]: cashfreeExecutor,
    [NodeType.AGGREGATE]: aggregateExecutor,
    [NodeType.POSTGRES]: postgresExecutor,
    [NodeType.GITHUB]: githubExecutor,
    [NodeType.GITHUB_TRIGGER]: githubTriggerExecutor,
}

export const getExecutor = (type: NodeType): NodeExecutor => {
    const executor = executorRegistry[type]
    if (!executor) {
        throw new Error(`No executor found for node type:${type}`)
    }

    return executor;

};
