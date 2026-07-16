import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import ky, { type Options as KyOptions } from "ky";
import { resolveTemplate } from "@/features/executions/lib/template-resolver";
import { workdayChannel } from "@/inngest/channels/workday";

type WorkdayData = {
    variableName?: string,
    // Connection
    tenantUrl?: string,
    tenantId?: string,
    clientId?: string,
    clientSecret?: string,
    // Operation
    resource?: "human_resources" | "financial_management",
    operation?: "getWorker" | "getAllWorkers" | "getInvoices" | "submitExpense" | "getTimeOff" | "updateContact",
    // Inputs
    workerId?: string
    apiVersion?: string
    limit?: number
    jsonBody?: string
};

const OPERATION_MAP = {
    getWorker: { method: "GET", path: "/workers/{{workerId}}" },
    getAllWorkers: { method: "GET", path: "/workers" },
    getTimeOff: { method: "GET", path: "/timeOffRequests" },
    updateContact: { method: "PUT", path: "/workers/{{workerId}}/contactInformation" },
    getInvoices: { method: "GET", path: "/invoices" },
    submitExpense: { method: "POST", path: "/expenses" }
} as const;

export const workdayExecutor: NodeExecutor<WorkdayData> = async ({
  data,
    nodeId,
    context,
    step,
    publish
}) => {

    await publish(
        workdayChannel().status({
            nodeId,
            status: "loading"
        })
    )


    try {
        const result = await step.run("workday-request", async () => {
            // 1. Validation
            if (!data.tenantUrl || !data.tenantId) {
                throw new NonRetriableError("Workday node: Tenant URL and Tenant ID are required");
            }
            if (!data.operation || !OPERATION_MAP[data.operation]) {
                throw new NonRetriableError("Workday node: Invalid or missing operation");
            }

            // 2. Auth Headers 

            const headers: Record<string, string> = {
                "Content-Type": "application/json"
            };
            if (data.clientSecret) {
                headers["Authorization"] = `Bearer ${data.clientSecret} `;
            }

            // 3. URL Construction
            const operationConfig = OPERATION_MAP[data.operation];

            // Handlebars compilation for dynamic inputs
            const workerId = data.workerId ? resolveTemplate(data.workerId, context) : "";

            // Path construction
            let endpointPath: string = operationConfig.path;
            if (endpointPath.includes("{{workerId}}")) {
                if (!workerId) throw new NonRetriableError("Workday node: Worker ID is required for this operation");
                endpointPath = endpointPath.replace("{{workerId}}", workerId);
            }

            const apiVersion = data.apiVersion || "v40.0";
            const url = `${data.tenantUrl!.replace(/\/$/, "").trim()}/ccx/api/${data.resource!.trim()}/${data.tenantId!.trim()}/${apiVersion.trim()}${endpointPath.trim()}`;

            console.log("Workday Request URL:", url);

            // 4. Request
            const options: KyOptions = {
                method: operationConfig.method,
                headers: headers,
                throwHttpErrors: true
            };

            if (["POST", "PUT"].includes(operationConfig.method) && data.jsonBody) {
                const compiledBody = resolveTemplate(data.jsonBody, context);
                try {
                    options.json = JSON.parse(compiledBody);
                } catch (e) {
                    options.body = compiledBody;
                }
            }

            if (operationConfig.method === "GET" && data.limit) {
                // Logic to append limit if needed, though usually part of query params handled by ky or manually appended.
                // For now, leaving as is or appending to URL.
                // url += `? limit = ${ data.limit } `; // Simple append for MVP
            }

            const response = await ky(url, options);
            const dataRes = await response.json();

            return {
                data: dataRes,
                status: response.status,
                statusText: response.statusText
            };
        });

        await publish(
            workdayChannel().status({
                nodeId,
                status: "success"
            })
        )

        return {
            ...context,
            [data.variableName || "workdayResponse"]: result
        }

    } catch (error) {
        console.error("Workday Executor Error:", error);
        await publish(
            workdayChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw error;
    }
}
