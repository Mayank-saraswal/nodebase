# Discord operation matrix (Nodebase → Corsair)

Source: `@corsair-dev/discord` (`discord.api.*`). Auth: bot `api_key`.

| Group | Corsair endpoints | Product aliases |
|-------|-------------------|-----------------|
| Messages | send, reply, get, list, edit, delete | SEND_MESSAGE, REPLY_MESSAGE, GET_MESSAGE, LIST_MESSAGES, EDIT_MESSAGE, DELETE_MESSAGE |
| Threads | create, createFromMessage | CREATE_THREAD, CREATE_THREAD_FROM_MESSAGE |
| Reactions | add, remove, list | ADD_REACTION, REMOVE_REACTION, LIST_REACTIONS |
| Guilds | list, get | LIST_GUILDS, GET_GUILD |
| Channels | list | LIST_CHANNELS |
| Members | list, get | LIST_MEMBERS, GET_MEMBER |

Completeness test asserts registry ⊇ all nested endpoints above.

Legacy dual-path: inbound webhook URL post (`content` + optional `username`) when Corsair is off or bot ops not configured.
