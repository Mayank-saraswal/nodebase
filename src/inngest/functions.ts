
import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import prisma from "@/lib/db";
import { topologicalSort } from "./utils";
import { ExecutionStatus, NodeType } from "@/generated/prisma";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { buildExecutionLevels, mergeParallelResults } from "@/features/executions/lib/build-execution-levels";
import { httpRequestChannel } from "./channels/http-request";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { googleformTriggerChannel } from "./channels/google-form-trigger";
import { stripeTriggerChannel } from "./channels/stripe-trigger";
import { discordChannel } from "./channels/discord";
import { slackChannel } from "./channels/slack";
import { telegramChannel } from "./channels/telegram";
import { xChannel } from "./channels/x";
import { workdayChannel } from "./channels/workday";
import { webhookTriggerChannel } from "./channels/webhook-trigger";
import { scheduleTriggerChannel } from "./channels/schedule-trigger";
import { setVariableChannel } from "./channels/set-variable";
import { googleSheetsChannel } from "./channels/google-sheets";
import { googleDriveChannel } from "./channels/google-drive";
import { whatsappChannel } from "./channels/whatsapp"
import { codeChannel } from "./channels/code";
import { loopChannel } from "./channels/loop";
import { notionChannel } from "./channels/notion";
import { razorpayChannel } from "./channels/razorpay";
import { gmailChannel } from "./channels/gmail";
import { switchChannel } from "./channels/switch";
import { waitChannel } from "./channels/wait";
import { mergeChannel } from "./channels/merge";
import { errorTriggerChannel } from "./channels/error-trigger";
import { razorpayTriggerChannel } from "./channels/razorpay-trigger"
import { whatsappTriggerChannel } from "./channels/whatsapp-trigger";
import { msg91Channel } from "./channels/msg91";
import { shiprocketChannel } from "./channels/shiprocket";
import { zohoCrmChannel } from "@/features/executions/components/zoho-crm/channels";
import { freshdeskChannel } from "./channels/freshdesk";
import { aiChannel } from "./channels/ai";
import { mediaUploadChannel } from "./channels/media-upload";
import { sortChannel } from "./channels/sort";
import { filterChannel } from "./channels/filter";
import { cashfreeChannel } from "./channels/cashfree";
import { aggregateChannel } from "./channels/aggregate";
import { postgresChannel } from "./channels/postgres";
import { githubChannel } from "./channels/github";


const MAX_JSON_LENGTH = 100_000;

function truncateJson(obj: unknown): string {
  try {
    const json = JSON.stringify(obj);
    return json.length > MAX_JSON_LENGTH ? json.slice(0, MAX_JSON_LENGTH) : json;
  } catch {
    return "";
  }
}


export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: process.env.NODE_ENV === "production" ? 3 : 0,
    concurrency: {
      limit: 3,
      key: "event.data.workflowId",
    },
    onFailure: async ({ event, step }) => {

      const updatedExecution = await step.run("mark-execution-failed", async () => {
        return prisma.execution.update({
          where: {
            inngestEventId: event.data.event.id,
          },
          data: {
            status: ExecutionStatus.FAILED,
            error: event.data.error.message,
            errorStack: event.data.error.stack,

          },
          select: {
            id: true,
            workflowId: true,
          },
        });
      });

      await step.run("fire-error-triggers", async () => {
        const errorTriggerNodes = await prisma.errorTriggerNode.findMany({
          where: { workflowId: updatedExecution.workflowId },
        });
        if (errorTriggerNodes.length === 0) return;

        const failedNodeExecs = await prisma.nodeExecution.findMany({
          where: {
            executionId: updatedExecution.id,
            status: "failed",
          },
          orderBy: { executionOrder: "desc" },
          take: 1,
        });
        const failedNode = failedNodeExecs[0];

        // Send event to trigger separate error-triggered workflow execution
        await inngest.send({
          name: "workflow/execute.error-triggered",
          data: {
            workflowId: updatedExecution.workflowId,
            executionId: updatedExecution.id,
            errorMessage: event.data.error.message,
            errorStack: event.data.error.stack,
            failedNodeName: failedNode?.nodeName ?? "",
            failedNodeId: failedNode?.nodeId ?? "",
            failedNodeType: failedNode?.nodeType ?? "",
          },
        });

        for (const trigger of errorTriggerNodes) {
          await prisma.nodeExecution.create({
            data: {
              executionId: updatedExecution.id,
              nodeId: trigger.nodeId,
              nodeName: "Error Trigger",
              nodeType: "ERROR_TRIGGER",
              status: "success",
              inputJson: JSON.stringify({
                error: event.data.error.message,
                nodeName: failedNode?.nodeName ?? "",
                nodeId: failedNode?.nodeId ?? "",
              }),
              outputJson: JSON.stringify({
                [trigger.variableName]: {
                  message: event.data.error.message,
                  stack: event.data.error.stack,
                  nodeName: failedNode?.nodeName ?? "",
                  nodeId: failedNode?.nodeId ?? "",
                  executionId: updatedExecution.id,
                  workflowId: updatedExecution.workflowId,
                  timestamp: new Date().toISOString(),
                },
              }),
              durationMs: 0,
              executionOrder: 9999,
            },
          });
        }
      });
    }

  },
  {
    event: "workflow/execute.workflow",
    channels: [
      httpRequestChannel(),
      manualTriggerChannel(),
      googleformTriggerChannel(),
      stripeTriggerChannel(),
      discordChannel(),
      slackChannel(),
      telegramChannel(),
      xChannel(),
      workdayChannel(),
      webhookTriggerChannel(),
      scheduleTriggerChannel(),
      setVariableChannel(),
      googleSheetsChannel(),
      googleDriveChannel(),
      codeChannel(),
      whatsappChannel(),
      loopChannel(),
      notionChannel(),
      razorpayChannel(),
      gmailChannel(),
      switchChannel(),
      waitChannel(),
      mergeChannel(),
      errorTriggerChannel(),
      razorpayTriggerChannel(),
      whatsappTriggerChannel(),
      msg91Channel(),
      shiprocketChannel(),
      zohoCrmChannel(),
      freshdeskChannel(),
      aiChannel(),
      mediaUploadChannel(),
      sortChannel(),
      filterChannel(),
      cashfreeChannel(),
      aggregateChannel(),
      postgresChannel(),
      githubChannel(),

    ]
  },
  async ({ event, step, publish }) => {

    const inngestEventId = event.id;
    const workflowId = event.data.workflowId;

    if (!inngestEventId || !workflowId) {
      throw new NonRetriableError("Inngest event ID or Workflow ID is missing");
    }

    const execution = await step.run("create-execution", async () => {
      return await prisma.execution.create({
        data: {
          inngestEventId,
          workflowId,
        },
      });
    });

    const executionDbId = execution.id;
    let nodeOrder = 0;

    const preparedWorkflow = await step.run("prepare-workflow", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: workflowId,
        },
        include: {
          nodes: true,
          connections: true
        },

      });
      return {
        sortedNodes: topologicalSort(workflow.nodes, workflow.connections),
        connections: workflow.connections,
      };

    })

    const userId = await step.run("find-user-id", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: workflowId,
        },
        select: {
          userId: true
        }
      })
      return workflow.userId;
    })

    //Initialize the context with any initial data from the trigger 
    let context: Record<string, unknown> = event.data.initialData || {};

    // Inject executionId so media-service can organize blobs by execution
    context = {
      ...context,
      __executionId: executionDbId,
    };

    // Track nodes to skip due to IF_ELSE branching
    const skippedNodes = new Set<string>();

    // Track nodes already executed by Loop node (per-item downstream execution)
    const executedByLoop = new Set<string>();

    // Prepare workflow graph info to pass to executors (for Loop node)
    const workflowNodes = preparedWorkflow.sortedNodes.map((n) => ({
      id: n.id,
      type: n.type,
      data: n.data as Record<string, unknown>,
    }));
    const workflowConnections = preparedWorkflow.connections.map((c) => ({
      id: c.id,
      fromNodeId: c.fromNodeId,
      toNodeId: c.toNodeId,
      fromOutput: c.fromOutput,
      toInput: c.toInput,
    }));

    // Hoist: build a lookup closure once per workflow
    const resolveExecutor = (type: NodeType) => getExecutor(type)

    // Build execution levels — nodes in the same level run in parallel
    const executionLevels = buildExecutionLevels(
      preparedWorkflow.sortedNodes,
      preparedWorkflow.connections
    )

    for (const level of executionLevels) {
      // Filter out nodes that should be skipped
      const executableNodes = level.filter(
        (node) =>
          !skippedNodes.has(node.id) && !executedByLoop.has(node.id)
      )

      if (executableNodes.length === 0) continue

      if (
        executableNodes.length === 1 ||
        executableNodes.some((n) => n.type === NodeType.LOOP)
      ) {
        // ── Sequential path: single node or level contains Loop ──
        for (const node of executableNodes) {
          // Re-check skip sets (a prior node in this level may have updated them)
          if (skippedNodes.has(node.id)) continue
          if (executedByLoop.has(node.id)) continue

          const executor = resolveExecutor(node.type as NodeType)
          const inputSnapshot = { ...context }
          const nodeStartTime = Date.now()
          let nodeOutput: Record<string, unknown> = {}
          let nodeStatus = "success"
          let nodeError = ""
          try {
            context = await executor({
              data: node.data as Record<string, unknown>,
              nodeId: node.id,
              userId,
              context,
              step,
              publish,
              workflowNodes,
              workflowConnections,
            })
            nodeOutput = context
          } catch (err) {
            nodeStatus = "failed"
            nodeError = err instanceof Error ? err.message : String(err)
            throw err
          } finally {
            nodeOrder++
            await step.run(`snapshot-node-${node.id}-${nodeOrder}`, async () => {
              return prisma.nodeExecution.create({
                data: {
                  executionId: executionDbId,
                  nodeId: node.id,
                  nodeName: node.name,
                  nodeType: node.type,
                  status: nodeStatus,
                  inputJson: truncateJson(inputSnapshot),
                  outputJson: truncateJson(nodeOutput),
                  errorMessage: nodeError,
                  durationMs: Date.now() - nodeStartTime,
                  executionOrder: nodeOrder,
                },
              })
            })
          }

          // Handle IF_ELSE branching: skip nodes on the non-taken branch
          if (node.type === NodeType.IF_ELSE || node.type === NodeType.SWITCH) {
            const branch = (context as Record<string, unknown>).branch as string | undefined;
            if (branch) {
              const nonTakenConnections = preparedWorkflow.connections.filter(
                (c) => c.fromNodeId === node.id && c.fromOutput !== `source-${branch}`
              );
              const toSkip = nonTakenConnections.map((c) => c.toNodeId);
              while (toSkip.length > 0) {
                const nodeIdToSkip = toSkip.pop()!;
                if (skippedNodes.has(nodeIdToSkip)) continue;
                skippedNodes.add(nodeIdToSkip);
                const downstream = preparedWorkflow.connections
                  .filter((c) => c.fromNodeId === nodeIdToSkip)
                  .map((c) => c.toNodeId);
                toSkip.push(...downstream);
              }
            }
          }

          // Handle Loop node: mark downstream nodes as already executed
          if (node.type === NodeType.LOOP) {
            const loopHandled = context._executedByLoop;
            if (Array.isArray(loopHandled)) {
              for (const id of loopHandled) {
                executedByLoop.add(id as string);
              }
              const { _executedByLoop, ...cleanContext } = context;
              context = cleanContext;
            }
          }
        }
      } else {
        // ── Parallel path: multiple independent nodes ──
        // Each node receives the SAME input context (snapshot before this level)
        // Their outputs are merged after all complete
        const contextSnapshot = { ...context }
        const parallelStartTimes: number[] = new Array(executableNodes.length)

        const results = await Promise.all(
          executableNodes.map(async (node, idx) => {
            const executor = resolveExecutor(node.type as NodeType)
            parallelStartTimes[idx] = Date.now()
            let nodeStatus = "success"
            let nodeError = ""
            let nodeOutput: Record<string, unknown> = {}
            try {
              nodeOutput = await executor({
                data: node.data as Record<string, unknown>,
                nodeId: node.id,
                userId,
                context: contextSnapshot,
                step,
                publish,
                workflowNodes,
                workflowConnections,
              })
              return nodeOutput
            } catch (err) {
              nodeStatus = "failed"
              nodeError = err instanceof Error ? err.message : String(err)
              throw err
            } finally {
              nodeOrder++
              await step.run(`snapshot-node-${node.id}-${nodeOrder}`, async () => {
                return prisma.nodeExecution.create({
                  data: {
                    executionId: executionDbId,
                    nodeId: node.id,
                    nodeName: node.name,
                    nodeType: node.type,
                    status: nodeStatus,
                    inputJson: truncateJson(contextSnapshot),
                    outputJson: truncateJson(nodeOutput),
                    errorMessage: nodeError,
                    durationMs: Date.now() - parallelStartTimes[idx],
                    executionOrder: nodeOrder,
                  },
                })
              })
            }
          })
        )

        // Handle IF_ELSE branching and Loop cleanup for parallel results
        for (let i = 0; i < executableNodes.length; i++) {
          const node = executableNodes[i]
          const result = results[i]

          if (node.type === NodeType.IF_ELSE || node.type === NodeType.SWITCH) {
            const branch = (result as Record<string, unknown>).branch as string | undefined;
            if (branch) {
              const nonTakenConnections = preparedWorkflow.connections.filter(
                (c) => c.fromNodeId === node.id && c.fromOutput !== `source-${branch}`
              );
              const toSkip = nonTakenConnections.map((c) => c.toNodeId);
              while (toSkip.length > 0) {
                const nodeIdToSkip = toSkip.pop()!;
                if (skippedNodes.has(nodeIdToSkip)) continue;
                skippedNodes.add(nodeIdToSkip);
                const downstream = preparedWorkflow.connections
                  .filter((c) => c.fromNodeId === nodeIdToSkip)
                  .map((c) => c.toNodeId);
                toSkip.push(...downstream);
              }
            }
          }

          if (node.type === NodeType.LOOP) {
            const loopHandled = (result as Record<string, unknown>)._executedByLoop;
            if (Array.isArray(loopHandled)) {
              for (const id of loopHandled) {
                executedByLoop.add(id as string);
              }
            }
          }
        }

        // Merge all parallel outputs into context for the next level
        context = mergeParallelResults(contextSnapshot, results)

        // Clean up the internal _executedByLoop flag from merged context
        if (context._executedByLoop) {
          const { _executedByLoop, ...cleanContext } = context;
          context = cleanContext;
        }
      }
    }

    await step.run("update-execution", async () => {
      return await prisma.execution.update({
        where: {
          inngestEventId,
          workflowId,
        },
        data: {
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context as any,
        },
      });
    });
    return {
      workflowId,
      result: context
    }
  }
);

export const executeErrorTriggeredWorkflow = inngest.createFunction(
  {
    id: "execute-error-triggered-workflow",
    retries: 1,
  },
  {
    event: "workflow/execute.error-triggered",
  },
  async ({ event, step }) => {
    const {
      workflowId,
      executionId,
      errorMessage,
      errorStack,
      failedNodeName,
      failedNodeId,
      failedNodeType,
    } = event.data as {
      workflowId: string
      executionId: string
      errorMessage: string
      errorStack: string
      failedNodeName: string
      failedNodeId: string
      failedNodeType: string
    };

    // Find Error Trigger nodes in this workflow
    const errorTriggerNodes = await step.run("find-error-triggers", async () => {
      return prisma.errorTriggerNode.findMany({
        where: { workflowId },
      });
    });

    if (errorTriggerNodes.length === 0) return { skipped: true };

    // Get workflow to find downstream connections from error trigger nodes
    const workflow = await step.run("get-workflow", async () => {
      return prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: {
          nodes: true,
          connections: true,
        },
      });
    });

    const userId = workflow.userId;

    for (const trigger of errorTriggerNodes) {
      // Build the error context that downstream nodes will receive
      const errorContext: Record<string, unknown> = {
        [trigger.variableName]: {
          message: errorMessage,
          stack: errorStack,
          failedNodeName,
          failedNodeId,
          failedNodeType,
          executionId,
          workflowId,
          failedAt: new Date().toISOString(),
        },
      };

      // Find downstream nodes connected to this Error Trigger node
      const downstreamConnections = workflow.connections.filter(
        (c) => c.fromNodeId === trigger.nodeId
      );

      // Execute downstream nodes sequentially
      let context = errorContext;
      for (const conn of downstreamConnections) {
        const node = workflow.nodes.find((n) => n.id === conn.toNodeId);
        if (!node) continue;

        const executor = getExecutor(node.type as NodeType);
        context = await executor({
          data: node.data as Record<string, unknown>,
          nodeId: node.id,
          userId,
          context,
          step,
          publish: async () => {}, // no realtime publishing for error-triggered runs
          workflowNodes: workflow.nodes.map((n) => ({
            id: n.id,
            type: n.type,
            data: n.data as Record<string, unknown>,
          })),
          workflowConnections: workflow.connections.map((c) => ({
            id: c.id,
            fromNodeId: c.fromNodeId,
            toNodeId: c.toNodeId,
            fromOutput: c.fromOutput,
            toInput: c.toInput,
          })),
        });
      }
    }

    return { workflowId, triggered: true };
  }
);
