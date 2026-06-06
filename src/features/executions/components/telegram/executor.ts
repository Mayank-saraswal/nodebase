import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { resolveTemplate } from "@/features/executions/lib/template-resolver";
import { telegramChannel } from "@/inngest/channels/telegram";
import { decode } from "html-entities";
import ky from "ky";

type TelegramData = {
    variableName?: string
    botToken?: string
    chatId?: string
    content?: string
};
export const telegramExecutor: NodeExecutor<TelegramData> = async ({
  data,
    nodeId,
    context,
    step,
    publish,
    userId
}) => {

    await publish(
        telegramChannel().status({
            nodeId,
            status: "loading"
        })
    )





    if (!data.content) {
        await publish(
            telegramChannel().status({
                nodeId,
                status: "error",

            })
        );
        throw new NonRetriableError("telegram node: content is missing")
    }




    const rawContent = resolveTemplate(data.content, context)
    const content = decode(rawContent)

    //Fetch credentials 



    try {
        const result = await step.run("telegram-send-message", async () => {

            if (!data.botToken) {
                await publish(
                    telegramChannel().status({
                        nodeId,
                        status: "error",

                    })
                );
                throw new NonRetriableError("telegram node: bot token is missing")
            }
            if (!data.chatId) {
                await publish(
                    telegramChannel().status({
                        nodeId,
                        status: "error",

                    })
                );
                throw new NonRetriableError("telegram node: chat id is missing")
            }

            await ky.post(`https://api.telegram.org/bot${data.botToken}/sendMessage`, {
                json: {
                    chat_id: data.chatId,
                    text: content.slice(0, 4096), //Telegram has a limit of 4096 characters

                }
            })
        });

        if (!data.variableName) {
            await publish(
                telegramChannel().status({
                    nodeId,
                    status: "error",

                })
            );
            throw new NonRetriableError("telegram node: Variable name is missing")
        }

        await publish(
            telegramChannel().status({
                nodeId,
                status: "success",

            }),
        )

        return {
            ...context,
            [data.variableName]: {
                messageContent: content.slice(0, 4096),
            },
        }



    } catch (error) {
        console.error('Telegram Error:', error);
        await publish(
            telegramChannel().status({
                nodeId,
                status: "error",

            })
        )
        throw new NonRetriableError(`Telegram  error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}