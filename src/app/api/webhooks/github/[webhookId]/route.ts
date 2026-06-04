import { sendWorkflowExecution } from "@/inngest/utils";
import prisma from "@/lib/db";
import { claimIdempotencyKey } from "@/lib/redis";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

function verifyGitHubSignature(
  secret: string,
  payload: string,
  signature: string
): boolean {
  if (!signature || !secret) return false;
  try {
    const hmac = crypto.createHmac("sha256", secret);
    const digest = "sha256=" + hmac.update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch (error) {
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10_000_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const { webhookId } = await params;

    if (!webhookId) {
      return NextResponse.json(
        { success: false, error: "Missing webhookId" },
        { status: 400 }
      );
    }

    const webhookTrigger = await prisma.gitHubTriggerNode.findFirst({
      where: { webhookId },
    });

    if (!webhookTrigger) {
      return NextResponse.json(
        { success: false, error: "Webhook not found" },
        { status: 404 }
      );
    }

    const rawTextBody = await request.text().catch(() => "");
    const signature = request.headers.get("x-hub-signature-256") || "";

    // Verify signature if a secret is configured
    if (webhookTrigger.webhookSecret) {
      const isValid = verifyGitHubSignature(
        webhookTrigger.webhookSecret,
        rawTextBody,
        signature
      );
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    let body = {};
    try {
      if (rawTextBody) {
        body = JSON.parse(rawTextBody);
      }
    } catch {
      // Keep empty
    }

    const githubEvent = request.headers.get("x-github-event") || "unknown";
    const githubDelivery = request.headers.get("x-github-delivery") || "";

    // GitHub's delivery ID acts as a natural idempotency key
    const idempotencyKey = `github-webhook:${webhookId}:${githubDelivery}`;
    const isFirstDelivery = await claimIdempotencyKey(idempotencyKey, 3600); // 1 hour TTL

    if (!isFirstDelivery) {
      console.log(
        `[GitHub Webhook] Duplicate delivery ${githubDelivery} discarded for workflow ${webhookTrigger.workflowId}`
      );
      return NextResponse.json({
        success: true,
        status: "duplicate_discarded",
      });
    }

    const receivedAt = new Date().toISOString();

    await sendWorkflowExecution({
      workflowId: webhookTrigger.workflowId,
      inngestId: idempotencyKey,
      initialData: {
        github: {
          event: githubEvent,
          deliveryId: githubDelivery,
          body,
          receivedAt,
        },
      },
    });

    return NextResponse.json({
      success: true,
      status: "accepted",
      receivedAt,
    });
  } catch (error) {
    console.error("GitHub webhook trigger error: ", error);
    return NextResponse.json(
      { success: false, error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
