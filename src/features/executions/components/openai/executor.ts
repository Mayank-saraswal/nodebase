import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { createOpenAI} from "@ai-sdk/openai";
import { resolveTemplate } from "@/features/executions/lib/template-resolver";
import { generateText } from "ai";
import { openAiChannel } from "@/inngest/channels/openai";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

type OpenAiData = {
    variableName?:string
    // model?: string;
    credentialId?:string
    userPrompt?: string;
    systemPrompt?: string;
};
export const openAiExecutor:NodeExecutor<OpenAiData > = async({
  data,
    nodeId,
    context,
    userId,
    step,
    publish
}) =>{

     await publish (
        openAiChannel().status({
            nodeId,
            status:"loading"
        })
     )


     if (!data.variableName) {
        await publish(
            openAiChannel().status({
                nodeId,
                status:"error",
                
            })
         );
         throw new NonRetriableError("OpenAi node: Variable name is missing")
     }

     if (!data.userPrompt) {
        await publish(
            openAiChannel().status({
                nodeId,
                status:"error",
                
            })
         );
         throw new NonRetriableError("OpenAi node: user prompt is missing")
     }

     if (!data.credentialId) {
             await publish(
                 openAiChannel().status({
                     nodeId,
                     status:"error",
                     
                 })
              );
              throw new NonRetriableError("OpenAi node: credential is missing")
          }

     const credential = await step.run("get-credential",()=>{
        return prisma.credential.findUnique({
            where:{
                id:data.credentialId,
                userId
            }
        })
    });

    if (!credential) {
        throw new NonRetriableError("OpenAi node: credential not found")
    }

 
    const systemPrompt = data.systemPrompt 
    ? resolveTemplate(data.systemPrompt, context)
    :   "You are a helpful assistant" 

    const userPrompt = data.userPrompt 
    ? resolveTemplate(data.userPrompt, context)
    : "No prompt provided"

    
     

    const openai = createOpenAI({
        apiKey: decrypt(credential.value)
    })


    try {
        const {steps} = await step.ai.wrap(
            "openai-generate-text",
            generateText,
            {
                model: openai("gpt-5.1"),
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
            openAiChannel().status({
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
        console.error('OpenAi API Error:', error);
        await publish(
            openAiChannel().status({
                nodeId,
                status:"error",
                
            })
         )
        throw new NonRetriableError(`OpenAi API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}