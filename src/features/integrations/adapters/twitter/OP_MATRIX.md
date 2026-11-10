# X (Twitter) operation matrix (Nodebase → Corsair)

Source: `@corsair-dev/twitter` (`twitter.api.*`). Auth: `oauth_2`.

| Group | Corsair endpoints | Product aliases |
|-------|-------------------|-----------------|
| Tweets | create, createReply | POST_TWEET, CREATE_TWEET, SEND_TWEET, REPLY_TWEET, CREATE_REPLY |

Completeness test asserts registry ⊇ both nested endpoints.

Legacy dual-path: OAuth 1.0a via `twitter-api-v2` with keys on node config when Corsair is off.
