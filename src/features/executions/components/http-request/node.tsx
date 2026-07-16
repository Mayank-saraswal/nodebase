"use client";
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { GlobeIcon } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/triggers/components/shared/hooks/use-node-status";
import { HTTP_REQUEST_CHANNEL_NAME } from "@/inngest/channels/http-request";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchHttpRequestRealtimeToken } from "./actions";
import { HttpRequestDialog, type HttpRequestFormValues } from "./dialog";

type HttpRequestNodeData = {
  variableName?: string;
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  body?: string;
  contentType?: "json" | "form-urlencoded" | "form-data" | "raw";
  headers?: { key: string; value: string }[];
  queryParameters?: { key: string; value: string }[];
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

type HttpRequestNodeType = Node<HttpRequestNodeData>;
export const HttpRequestNode = memo((props: NodeProps<HttpRequestNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: HTTP_REQUEST_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchHttpRequestRealtimeToken,
  });
  const handleOpenSettings = () => setDialogOpen(true);
  const handleSubmit = (values: HttpRequestFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...values,
            },
          };
        }
        return node;
      }),
    );
  };
  const nodeData = props.data;
  const endpoint = nodeData?.endpoint || (nodeData as any)?.url;
  const description = endpoint
    ? `${nodeData.method || "GET"}: ${endpoint}`
    : "Not configured";

  return (
    <>
      <HttpRequestDialog
        onSubmit={handleSubmit}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        name="HTTP Request"
        id={props.id}
        status={nodeStatus}
        icon={GlobeIcon}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

HttpRequestNode.displayName = "HttpRequestNode";
