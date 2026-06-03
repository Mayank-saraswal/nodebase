import type { NodeExecutor } from "@/features/executions/types";
import { googleformTriggerChannel } from "@/inngest/channels/google-form-trigger";


type googleFormTriggerData = Record<string, unknown>;
export const googleFormTriggerExecutor:NodeExecutor<googleFormTriggerData> = async({
    
    nodeId,
    context,
    step,
    publish,
}) =>{
      await publish(
        googleformTriggerChannel().status({
            nodeId ,
            status:"loading"
        })
      )

    const result = await step.run("google=form-trigger", async()=>context)

     await publish(
        googleformTriggerChannel().status({
            nodeId ,
            status:"success"
        })
      )

     
    return result
}