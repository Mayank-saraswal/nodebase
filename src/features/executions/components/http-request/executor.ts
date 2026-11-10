import { NonRetriableError } from "inngest";
import ky, { type Options as KyOptions } from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveTemplate } from "@/features/executions/lib/template-resolver";
import { httpRequestChannel } from "@/inngest/channels/http-request";

type KeyValuePair = { key: string; value: string };

type HttpRequestData = {
  variableName?: string;
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  body?: string;
  contentType?: "json" | "form-urlencoded" | "form-data" | "raw";
  headers?: KeyValuePair[];
  queryParameters?: KeyValuePair[];
  authType?: "none" | "basicAuth" | "bearerToken" | "headerAuth";
  basicAuthUser?: string;
  basicAuthPassword?: string;
  bearerToken?: string;
  headerAuthName?: string;
  headerAuthValue?: string;
  timeout?: number;
  followRedirects?: boolean;
  responseFormat?: "auto" | "json" | "text";
};

function buildAuthHeaders(
  data: HttpRequestData,
  ctx: Record<string, unknown>,
): Record<string, string> {
  const headers: Record<string, string> = {};
  switch (data.authType) {
    case "basicAuth": {
      const user = resolveTemplate(data.basicAuthUser ?? "", ctx);
      const pass = resolveTemplate(data.basicAuthPassword ?? "", ctx);
      headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
      break;
    }
    case "bearerToken": {
      const token = resolveTemplate(data.bearerToken ?? "", ctx);
      headers.Authorization = `Bearer ${token}`;
      break;
    }
    case "headerAuth": {
      const name = resolveTemplate(data.headerAuthName ?? "", ctx);
      const value = resolveTemplate(data.headerAuthValue ?? "", ctx);
      if (name) {
        headers[name] = value;
      }
      break;
    }
  }
  return headers;
}

function buildQueryString(
  pairs: KeyValuePair[],
  ctx: Record<string, unknown>,
): string {
  const params = new URLSearchParams();
  for (const pair of pairs) {
    if (pair.key) {
      params.append(
        resolveTemplate(pair.key, ctx),
        resolveTemplate(pair.value, ctx),
      );
    }
  }
  return params.toString();
}

function buildCustomHeaders(
  pairs: KeyValuePair[],
  ctx: Record<string, unknown>,
): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const pair of pairs) {
    if (pair.key) {
      headers[resolveTemplate(pair.key, ctx)] = resolveTemplate(
        pair.value,
        ctx,
      );
    }
  }
  return headers;
}

export const httpRequestExecutor: NodeExecutor<HttpRequestData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    httpRequestChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("http-request", async () => {
      const endpointVal = data.endpoint || (data as any).url;
      if (!endpointVal) {
        throw new NonRetriableError("HttpRequest node: No endpoint configured");
      }

      if (!data.variableName) {
        throw new NonRetriableError(
          "HttpRequest node: Variable name not configured",
        );
      }

      if (!data.method) {
        throw new NonRetriableError("HttpRequest node: Method not configured");
      }

      const method = data.method;

      // Resolve endpoint URL with template variables
      let endpoint = resolveTemplate(endpointVal, context);

      // Append query parameters
      if (data.queryParameters && data.queryParameters.length > 0) {
        const qs = buildQueryString(data.queryParameters, context);
        if (qs) {
          endpoint += (endpoint.includes("?") ? "&" : "?") + qs;
        }
      }

      // Build request options
      const options: KyOptions = {
        method,
        redirect: data.followRedirects === false ? "manual" : "follow",
        timeout: data.timeout && data.timeout > 0 ? data.timeout : 30000,
      };

      // Build headers
      const headers: Record<string, string> = {};

      // Auth headers
      Object.assign(headers, buildAuthHeaders(data, context));

      // Custom headers
      if (data.headers && data.headers.length > 0) {
        Object.assign(headers, buildCustomHeaders(data.headers, context));
      }

      // Request body for methods that support it
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        const contentType = data.contentType ?? "json";

        switch (contentType) {
          case "json": {
            const resolved = resolveTemplate(data.body || "{}", context);
            try {
              JSON.parse(resolved);
            } catch {
              throw new NonRetriableError(
                "HTTP Request: Invalid JSON in request body. " +
                  "Check your body template resolves to valid JSON. " +
                  "Body received: " +
                  resolved.slice(0, 200),
              );
            }
            options.body = resolved;
            headers["Content-Type"] = "application/json";
            break;
          }
          case "form-urlencoded": {
            const resolved = resolveTemplate(data.body || "{}", context);
            const parsed = JSON.parse(resolved);
            const formParams = new URLSearchParams();
            for (const [k, v] of Object.entries(parsed)) {
              formParams.append(k, String(v));
            }
            options.body = formParams.toString();
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            break;
          }
          case "form-data": {
            const resolved = resolveTemplate(data.body || "{}", context);
            const parsed = JSON.parse(resolved);
            const formData = new FormData();
            for (const [k, v] of Object.entries(parsed)) {
              formData.append(k, String(v));
            }
            options.body = formData;
            // Let the runtime set the Content-Type with boundary
            break;
          }
          case "raw": {
            const resolved = resolveTemplate(data.body || "", context);
            options.body = resolved;
            if (!headers["Content-Type"]) {
              headers["Content-Type"] = "text/plain";
            }
            break;
          }
        }
      }

      options.headers = headers;

      const response = await ky(endpoint, options);
      const responseContentType = response.headers.get("content-type") ?? "";

      // Parse response based on configured format
      const responseFormat = data.responseFormat ?? "auto";
      let responseData: unknown;
      if (responseFormat === "json") {
        responseData = await response.json();
      } else if (responseFormat === "text") {
        responseData = await response.text();
      } else {
        // auto-detect
        responseData = responseContentType.includes("application/json")
          ? await response.json()
          : await response.text();
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responsePayload = {
        httpResponse: {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          data: responseData,
        },
      };

      return {
        ...context,
        [data.variableName]: responsePayload,
      };
    });

    await publish(
      httpRequestChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      httpRequestChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
