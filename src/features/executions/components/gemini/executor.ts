import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { resolveTemplate } from "@/features/executions/lib/template-resolver";
import {geminiChannel } from "@/inngest/channels/gemini";
import { generateText } from "ai";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

type GeminiData = {
    variableName?:string
    credentialId?:string
    // model?: string;
    userPrompt?: string;
    systemPrompt?: string;
};
export const geminiExecutor:NodeExecutor<GeminiData > = async({
  data,
    nodeId,
    context,
    step,
    publish,
    userId
}) =>{

     await publish (
        geminiChannel().status({
            nodeId,
            status:"loading"
        })
     )


     if (!data.variableName) {
        await publish(
            geminiChannel().status({
                nodeId,
                status:"error",
                
            })
         );
         throw new NonRetriableError("gemini node: Variable name is missing")
     }

     if (!data.userPrompt) {
        await publish(
            geminiChannel().status({
                nodeId,
                status:"error",
                
            })
         );
         throw new NonRetriableError("gemini node: user prompt is missing")
     }

     if (!data.credentialId) {
        await publish(
            geminiChannel().status({
                nodeId,
                status:"error",
                
            })
         );
         throw new NonRetriableError("gemini node: credential is missing")
     }
    
 
    const systemPrompt = data.systemPrompt 
    ? resolveTemplate(data.systemPrompt, context)
    :   "You are a helpful assistant" 

    const userPrompt = data.userPrompt 
    ? resolveTemplate(data.userPrompt, context)
    : "No prompt provided"

    //Fetch credentials 
    const credential = await step.run("get-credential",()=>{
        return prisma.credential.findUnique({
            where:{
                id:data.credentialId,
                userId
            }
        })
    });

    if (!credential) {
        throw new NonRetriableError("gemini node: credential not found")
    }


    const google = createGoogleGenerativeAI({
        apiKey: decrypt(credential.value)
    })


    try {
        const {steps} = await step.ai.wrap(
            "gemini-generate-text",
            generateText,
            {
                model: google("gemini-2.5-flash"),
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
            geminiChannel().status({
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
        console.error('Gemini API Error:', error);
        await publish(
            geminiChannel().status({
                nodeId,
                status:"error",
                
            })
         )
        throw new NonRetriableError(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}