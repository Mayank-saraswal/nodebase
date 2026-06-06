import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { resolveTemplate } from "@/features/executions/lib/template-resolver";
import { xChannel } from "@/inngest/channels/x";
import { decode } from "html-entities";
import { TwitterApi } from "twitter-api-v2";

type XData = {
    variableName?: string
    apiKey?: string
    apiSecretKey?: string
    accessToken?: string
    accessTokenSecret?: string
    content?: string
};

export const xExecutor: NodeExecutor<XData> = async ({
  data,
    nodeId,
    context,
    step,
    publish,
    userId
}) => {

    await publish(
        xChannel().status({
            nodeId,
            status: "loading"
        })
    )

    if (!data.content) {
        await publish(
            xChannel().status({
                nodeId,
                status: "error",

            })
        );
        throw new NonRetriableError("x node: content is missing")
    }

    const rawContent = resolveTemplate(data.content, context)
    const content = decode(rawContent)

    try {
        const result = await step.run("x-post-tweet", async () => {

            if (!data.apiKey) {
                throw new NonRetriableError("x node: API Key is missing")
            }
            if (!data.apiSecretKey) {
                throw new NonRetriableError("x node: API Secret Key is missing")
            }
            if (!data.accessToken) {
                throw new NonRetriableError("x node: Access Token is missing")
            }
            if (!data.accessTokenSecret) {
                throw new NonRetriableError("x node: Access Token Secret is missing")
            }

            const client = new TwitterApi({
                appKey: data.apiKey,
                appSecret: data.apiSecretKey,
                accessToken: data.accessToken,
                accessSecret: data.accessTokenSecret,
            });

            const rwClient = client.readWrite;
            const output = await rwClient.v2.tweet(content.slice(0, 280)); // X limit is 280
            return output;
        });

        if (!data.variableName) {
            await publish(
                xChannel().status({
                    nodeId,
                    status: "error",

                })
            );
            throw new NonRetriableError("x node: Variable name is missing")
        }

        await publish(
            xChannel().status({
                nodeId,
                status: "success",

            }),
        )

        return {
            ...context,
            [data.variableName]: result,
        }

    } catch (error) {
        console.error('X Error:', error);
        await publish(
            xChannel().status({
                nodeId,
                status: "error",

            })
        )
        throw new NonRetriableError(`X error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}
