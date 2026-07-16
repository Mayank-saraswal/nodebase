# Slack operation matrix (Nodebase → Corsair)

Source of truth: `@corsair-dev/slack` (`slack.api.*`).

| Nodebase op | Corsair API | Status |
|-------------|-------------|--------|
| MESSAGE_SEND | `messages.post` | **mapped** |
| MESSAGE_UPDATE | `messages.update` | **mapped** |
| MESSAGE_DELETE | `messages.delete` | **mapped** |
| MESSAGE_GET_PERMALINK | `messages.getPermalink` | **mapped** |
| MESSAGE_SEARCH | `messages.search` | **mapped** |
| MESSAGE_SEND_WEBHOOK | Incoming Webhook | **legacy only** (no Corsair) |
| MESSAGE_SCHEDULE | chat.scheduleMessage | **legacy only** |
| CHANNEL_GET / CHANNEL_INFO | `channels.get` | **mapped** |
| CHANNEL_LIST | `channels.list` | **mapped** |
| CHANNEL_CREATE | `channels.create` | **mapped** |
| CHANNEL_ARCHIVE | `channels.archive` | **mapped** |
| CHANNEL_UNARCHIVE | `channels.unarchive` | **mapped** |
| CHANNEL_INVITE | `channels.invite` | **mapped** |
| CHANNEL_KICK | `channels.kick` | **mapped** |
| CHANNEL_SET_TOPIC | `channels.setTopic` | **mapped** |
| CHANNEL_SET_PURPOSE | `channels.setPurpose` | **mapped** |
| CHANNEL_HISTORY | `channels.getHistory` | **mapped** |
| CHANNEL_RENAME | `channels.rename` | **mapped** |
| CONVERSATION_OPEN | `channels.open` | **mapped** |
| USER_GET / USER_INFO | `users.get` | **mapped** |
| USER_LIST | `users.list` | **mapped** |
| USER_GET_PRESENCE | `users.getPresence` | **mapped** |
| USER_SET_STATUS | `users.updateProfile` | **mapped** |
| USER_GET_BY_EMAIL | users.lookupByEmail | **legacy only** |
| REACTION_* | `reactions.*` | **mapped** |
| FILE_GET / FILE_LIST / FILE_UPLOAD | `files.*` | **mapped** |
| FILE_DELETE | — | **gap** (not in package) |

Completeness: registry keys cover Corsair nested endpoints (channels/users/messages/files/reactions/stars + product aliases).
