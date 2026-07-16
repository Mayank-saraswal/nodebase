/**
 * X/Twitter Corsair adapter.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  runTwitterOperation,
  type ResolvedTwitterFields,
  type TwitterApiClient,
} from "./operations"

export const twitterAdapter: IntegrationAdapter = {
  pluginId: "twitter",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    // unknown: Node.data JSON boundary
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "POST_TWEET")
    const variableName = String(config.variableName || "x")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError("X Corsair: missing tenant client.")
    }
    const tw = client as TwitterApiClient
    if (!tw.twitter?.api) {
      throw new NonRetriableError(
        "X Corsair: client.twitter.api missing. Is @corsair-dev/twitter registered?",
      )
    }

    const fields: ResolvedTwitterFields = {
      operation,
      text: t(
        (config.text as string) ||
          (config.content as string) ||
          (config.message as string) ||
          "",
        context,
      ),
      quoteTweetId: t(
        (config.quoteTweetId as string) ||
          (config.quote_tweet_id as string) ||
          "",
        context,
      ),
      inReplyToTweetId: t(
        (config.inReplyToTweetId as string) ||
          (config.in_reply_to_tweet_id as string) ||
          (config.replyToTweetId as string) ||
          "",
        context,
      ),
      mediaIds: t(
        (config.mediaIds as string) || (config.media_ids as string) || "",
        context,
      ),
      replySettings: t(
        (config.replySettings as string) ||
          (config.reply_settings as string) ||
          "",
        context,
      ),
      excludeReplyUserIds: t(
        (config.excludeReplyUserIds as string) ||
          (config.exclude_reply_user_ids as string) ||
          "",
        context,
      ),
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runTwitterOperation(tw, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "X")
    }

    return {
      ...context,
      [variableName]: {
        operation,
        ...apiResult,
        timestamp: new Date().toISOString(),
      },
    }
  },
}
