import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { resolveTemplate } from "@/features/executions/lib/template-resolver";
import { generateText } from "ai";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { deepseekChannel } from "@/inngest/channels/deepseek";
import { createDeepSeek } from "@ai-sdk/deepseek";

type DeepseekData = {
    variableName?: string
    credentialId?: string
    // model?: string;
    userPrompt?: string;
    systemPrompt?: string;
};
export const deepseekExecutor: NodeExecutor<DeepseekData> = async ({
  data,
    nodeId,
    context,
    step,
    publish,
    userId
}) => {

    await publish(
        deepseekChannel().status({
            nodeId,
            status: "loading"
        })
    )


    if (!data.variableName) {
        await publish(
            deepseekChannel().status({
                nodeId,
                status: "error",

            })
        );
        throw new NonRetriableError("deepseek node: Variable name is missing")
    }

    if (!data.userPrompt) {
        await publish(
            deepseekChannel().status({
                nodeId,
                status: "error",

            })
        );
        throw new NonRetriableError("deepseek node: user prompt is missing")
    }

    if (!data.credentialId) {
        await publish(
            deepseekChannel().status({
                nodeId,
                status: "error",

            })
        );
        throw new NonRetriableError("deepseek node: credential is missing")
    }


    const systemPrompt = data.systemPrompt
        ? resolveTemplate(data.systemPrompt, context)
        : "You are a helpful assistant"

    const userPrompt = data.userPrompt
        ? resolveTemplate(data.userPrompt, context)
        : "No prompt provided"

    //Fetch credentials 
    const credential = await step.run("get-credential", () => {
        return prisma.credential.findUnique({
            where: {
                id: data.credentialId,
                userId
            }
        })
    });

    if (!credential) {
        throw new NonRetriableError("deepseek node: credential not found")
    }


    const deepseek = createDeepSeek({
        apiKey: decrypt(credential.value)
    })


    try {
        const { steps } = await step.ai.wrap(
            "deepseek-generate-text",
            generateText,
            {
                model: deepseek("deepseek-chat"),
                prompt: userPrompt,
                system: systemPrompt,
                experimental_telemetry: {
                    isEnabled: true,
                    recordInputs: true,
                    recordOutputs: true
                }
            },
        )

        const text =
            steps[0].content[0].type === "text"
                ? steps[0].content[0].text
                : ""

        await publish(
            deepseekChannel().status({
                nodeId,
                status: "success",

            }),
        )
        return {
            ...context,
            [data.variableName]: {
                aiResponse: text,
            },
        }


    } catch (error) {
        console.error('Deepseek API Error:', error);
        await publish(
            deepseekChannel().status({
                nodeId,
                status: "error",

            })
        )
        throw new NonRetriableError(`Deepseek API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}