import type { NodeExecutor } from "@/features/executions/types";
import { githubChannel } from "@/inngest/channels/github";

type GitHubTriggerData = Record<string, unknown>;

export const githubTriggerExecutor: NodeExecutor<GitHubTriggerData> = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    githubChannel().status({
      nodeId,
      status: "loading",
    })
  );

  const result = await step.run("github-trigger", async () => context);

  await publish(
    githubChannel().status({
      nodeId,
      status: "success",
    })
  );

  return result;
};
