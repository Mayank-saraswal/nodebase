import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { resolveTemplate } from "@/features/executions/lib/template-resolver";
import { discordChannel } from "@/inngest/channels/discord";
import { decode } from "html-entities";
import ky from "ky";

type DiscordData = {
    variableName?:string
    credentialId?:string
    // model?: string;
    webhookUrl?:string
    content?:string
    username?:string
};
export const discordExecutor:NodeExecutor<DiscordData > = async({
  data,
    nodeId,
    context,
    step,
    publish,
    userId
}) =>{

     await publish (
        discordChannel().status({
            nodeId,
            status:"loading"
        })
    )





    if (!data.content) {
        await publish(
            discordChannel().status({
                nodeId,
                status:"error",

            })
        );
        throw new NonRetriableError("discord node: content is missing")
    }




    const rawContent = resolveTemplate(data.content, context)
    const content = decode(rawContent)
    const username = data.username ? decode(resolveTemplate(data.username, context)) : undefined
    //Fetch credentials 



    try {
       const result = await step.run("discord-webhook",async()=>{

            if (!data.webhookUrl) {
                await publish(
                    discordChannel().status({
                        nodeId,
                status:"error",

                    })
                );
                throw new NonRetriableError("discord node: webhook url is missing")
            }
        await ky.post(data.webhookUrl!,{
            json:{
                content:content.slice(0,2000), //Discord has a limit of 2000 characters
                    username,
                }
            })
        });

        if (!data.variableName) {
            await publish(
                discordChannel().status({
                    nodeId,
                status:"error",

                })
            );
            throw new NonRetriableError("discord node: Variable name is missing")
        }

        await publish(
            discordChannel().status({
                nodeId,
                status: "success",

            }),
        )

        return {
            ...context,
            [data.variableName]: {
                messageContent: content.slice(0, 2000),
            },
        }



    } catch (error) {
        console.error('Discord Error:', error);
        await publish(
            discordChannel().status({
                nodeId,
                status: "error",

            })
        )
        throw new NonRetriableError(`Discord  error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}