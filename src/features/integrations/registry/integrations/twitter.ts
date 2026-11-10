/**
 * X (Twitter) registry — full @corsair-dev/twitter surface.
 */

import type { IntegrationDefinition } from "../types"

export const twitterIntegrationDefinition: IntegrationDefinition = {
  typeKey: "twitter",
  kind: "integration",
  corsairPluginId: "twitter",
  label: "X (Twitter)",
  operations: [
    {
      key: "tweets.create",
      aliases: ["POST_TWEET", "CREATE_TWEET", "SEND_TWEET"],
      label: "Post Tweet",
      group: "Tweets",
      risk: "write",
    },
    {
      key: "tweets.createReply",
      aliases: ["REPLY_TWEET", "CREATE_REPLY"],
      label: "Reply to Tweet",
      group: "Tweets",
      risk: "write",
    },
  ],
}
