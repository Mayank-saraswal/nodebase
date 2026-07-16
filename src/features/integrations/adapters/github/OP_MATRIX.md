# GitHub operation matrix (Nodebase → Corsair)

Source of truth: `@corsair-dev/github` (`github.api.*`).

| Group | Corsair endpoints | Product aliases | Status |
|-------|-------------------|-----------------|--------|
| Issues | list, get, create, update, createComment | ISSUE_* | **mapped** |
| PRs | list, get, listReviews, createReview | PULL_REQUEST_* (subset) | **mapped** |
| Repos | list, get, listBranches, listCommits, getContent, star* | REPOSITORY_*, BRANCH_LIST, FILE_GET | **mapped** |
| Releases | list, get, create, update | RELEASE_* | **mapped** |
| Workflows | list, get, listRuns | WORKFLOW_* | **mapped** |
| Discussions | list, get | DISCUSSION_* | **mapped** |
| Forks | list | REPOSITORY_LIST_FORKS | **mapped** |
| Comments | list, listForIssue, get, update, delete | ISSUE_*_COMMENT | **mapped** |
| Events | list* | REPOSITORY_LIST_EVENTS, … | **mapped** |
| Users | list, get, getById, getAuthenticated, update, getHovercard | USER_* | **mapped** |

**Legacy-only** (not in package): REPOSITORY_CREATE/DELETE/FORK, PR merge/create, FILE write/delete, WORKFLOW_DISPATCH, branch create/delete, many assign/label helpers, etc. Dual-path executor falls back to native REST for those.

Completeness test: registry keys cover Corsair nested endpoints listed above.
