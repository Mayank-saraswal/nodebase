import type { NodeExecutor } from "@/features/executions/types";
import { webhookTriggerChannel } from "@/inngest/channels/webhook-trigger";

type GitHubTriggerData = Record<string, unknown>;

export const githubTriggerExecutor: NodeExecutor<GitHubTriggerData> = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    webhookTriggerChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const result = await step.run("github-trigger", async () => context);

    await publish(
      webhookTriggerChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    await publish(
      webhookTriggerChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
