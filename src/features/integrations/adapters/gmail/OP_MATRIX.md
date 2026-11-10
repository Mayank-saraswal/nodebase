# Gmail operation matrix (Nodebase → Corsair)

Source of truth: `@corsair-dev/gmail` (`gmail.api.*`).

| Nodebase `GmailOperation` | Corsair API | Status |
|---------------------------|-------------|--------|
| SEND | `messages.send` (+ MIME builder) | **mapped** |
| REPLY | `messages.get` + `messages.send` | **mapped** |
| FORWARD | `messages.get` + `messages.send` | **mapped** |
| GET_MESSAGE | `messages.get` | **mapped** |
| LIST_MESSAGES | `messages.list` + `messages.get` per id | **mapped** |
| SEARCH_MESSAGES | `messages.list` (`q`) + `messages.get` | **mapped** |
| DELETE_MESSAGE | `messages.delete` | **mapped** (permanent) |
| BATCH_MODIFY | `messages.batchModify` | **mapped** |
| ADD_LABEL | `messages.modify` | **mapped** |
| REMOVE_LABEL | `messages.modify` | **mapped** |
| MARK_READ | `messages.modify` remove UNREAD | **mapped** |
| MARK_UNREAD | `messages.modify` add UNREAD | **mapped** |
| MOVE_TO_TRASH | `messages.trash` | **mapped** |
| UNTRASH_MESSAGE | `messages.untrash` | **mapped** |
| CREATE_DRAFT | `drafts.create` | **mapped** |
| GET_DRAFT | `drafts.get` | **mapped** |
| UPDATE_DRAFT | `drafts.update` | **mapped** |
| DELETE_DRAFT | `drafts.delete` | **mapped** |
| GET_ATTACHMENT | inline body on `messages.get` only | **mapped (partial)** — large attachments need dedicated API (not in package) |
| LIST_THREADS | `threads.list` | **mapped** |
| GET_THREAD | `threads.get` | **mapped** |
| MODIFY_THREAD | `threads.modify` | **mapped** |
| DELETE_THREAD | `threads.delete` | **mapped** |
| TRASH_THREAD | `threads.trash` | **mapped** |
| UNTRASH_THREAD | `threads.untrash` | **mapped** |
| LIST_LABELS | `labels.list` | **mapped** |
| GET_LABEL | `labels.get` | **mapped** |
| CREATE_LABEL | `labels.create` | **mapped** |
| UPDATE_LABEL | `labels.update` | **mapped** |
| DELETE_LABEL | `labels.delete` | **mapped** |
| LIST_DRAFTS | `drafts.list` | **mapped** |
| SEND_DRAFT | `drafts.send` | **mapped** |

Implemented in `operations.ts` / `adapter.ts`. Unit tests: `__tests__/operations.test.ts`.  
Registry completeness: `registry/__tests__/completeness.test.ts`.
