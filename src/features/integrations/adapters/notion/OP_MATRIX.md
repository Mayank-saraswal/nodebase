# Notion operation matrix (Nodebase → Corsair)

Source of truth: `@corsair-dev/notion` (`notion.api.*`).

| Nodebase op | Corsair API | Status |
|-------------|-------------|--------|
| GET_DATABASE | `databases.getDatabase` | **mapped** |
| LIST_DATABASES | `databases.getManyDatabases` | **mapped** |
| SEARCH_DATABASE | `databases.searchDatabase` | **mapped** |
| CREATE_DATABASE_PAGE | `databasePages.createDatabasePage` | **mapped** |
| GET_PAGE | `databasePages.getDatabasePage` | **mapped** |
| QUERY_DATABASE | `databasePages.getManyDatabasePages` | **mapped** |
| UPDATE_DATABASE_PAGE | `databasePages.updateDatabasePage` | **mapped** |
| ARCHIVE_PAGE | `pages.archivePage` | **mapped** |
| CREATE_PAGE | `pages.createPage` | **mapped** |
| SEARCH | `pages.searchPage` | **mapped** |
| APPEND_BLOCK | `blocks.appendBlock` | **mapped** |
| GET_BLOCK_CHILDREN | `blocks.getManyChildBlocks` | **mapped** |
| GET_USER | `users.getUser` | **mapped** |
| GET_USERS | `users.getManyUsers` | **mapped** |

Completeness test covers all nested Corsair endpoints above.
