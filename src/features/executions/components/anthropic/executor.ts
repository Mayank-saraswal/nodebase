import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { createAnthropic} from "@ai-sdk/anthropic";
import { resolveTemplate } from "@/features/executions/lib/template-resolver";
import { generateText } from "ai";
import { anthropicChannel } from "@/inngest/channels/anthropic";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

type AnthropicData = {
    variableName?:string
    credentialId?:string
    // model?: string;
    userPrompt?: string;
    systemPrompt?: string;
};
export const anthropicExecutor:NodeExecutor<AnthropicData > = async({
  data,
    nodeId,
    context,
    step,
    publish,
    userId
}) =>{

     await publish (
        anthropicChannel().status({
            nodeId,
            status:"loading"
        })
     )


     if (!data.variableName) {
        await publish(
            anthropicChannel().status({
                nodeId,
                status:"error",
                
            })
         );
         throw new NonRetriableError("Anthropic node: Variable name is missing")
     }

     if (!data.userPrompt) {
        await publish(
            anthropicChannel().status({
                nodeId,
                status:"error",
                
            })
         );
         throw new NonRetriableError("Anthropic node: user prompt is missing")
     }

     if (!data.credentialId) {
        await publish(
            anthropicChannel().status({
                nodeId,
                status:"error",
                
            })
         );
         throw new NonRetriableError("Anthropic node: credential is missing")
     }

     
 
    const systemPrompt = data.systemPrompt 
    ? resolveTemplate(data.systemPrompt, context)
    :   "You are a helpful assistant" 

    const userPrompt = data.userPrompt 
    ? resolveTemplate(data.userPrompt, context)
    : "No prompt provided"

     const credential = await step.run("get-credential",()=>{
            return prisma.credential.findUnique({
                where:{
                    id:data.credentialId,
                    userId
                }
            })
        });
    
        if (!credential) {
            throw new NonRetriableError("anthropic node: credential not found")
        }

    

    const anthropic = createAnthropic({
        apiKey: decrypt(credential.value)
    })


    try {
        const {steps} = await step.ai.wrap(
            "anthropic-generate-text",
            generateText,
            {
                model: anthropic("claude-sonnet-4-0"),
                prompt: userPrompt,
                system: systemPrompt,
                experimental_telemetry:{
                    isEnabled:true,
                    recordInputs:true,
                    recordOutputs:true
                }
            },
        )

        const  text = 
        steps[0].content[0].type==="text"
        ? steps[0].content[0].text
        :""

        await publish(
            anthropicChannel().status({
                nodeId,
                status:"success",
                
            }),
        )
            return {
                ...context,
                [data.variableName]:{
                    aiResponse:text,
                },
            }
        
        
    } catch (error) {
        console.error('Anthropic API Error:', error);
        await publish(
            anthropicChannel().status({
                nodeId,
                status:"error",
                
            })
         )
        throw new NonRetriableError(`Anthropic error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}