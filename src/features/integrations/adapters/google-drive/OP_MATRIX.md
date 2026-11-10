# Google Drive operation matrix (Nodebase → Corsair)

Source of truth: `@corsair-dev/googledrive` (`googledrive.api.*`).

| Nodebase op | Corsair API | Status |
|-------------|-------------|--------|
| LIST_FILES | `files.list` | **mapped** |
| GET_FILE | `files.get` | **mapped** |
| CREATE_FROM_TEXT | `files.createFromText` | **mapped** |
| UPLOAD_FILE | `files.upload` / `createFromText` when content set | **mapped** |
| UPDATE_FILE | `files.update` | **mapped** |
| DELETE_FILE | `files.delete` | **mapped** |
| COPY_FILE | `files.copy` | **mapped** |
| MOVE_FILE | `files.move` | **mapped** |
| DOWNLOAD_FILE | `files.download` + `files.get` | **mapped** |
| SHARE_FILE | `files.share` | **mapped** |
| CREATE_FOLDER | `folders.create` | **mapped** |
| GET_FOLDER | `folders.get` | **mapped** |
| LIST_FOLDERS | `folders.list` | **mapped** |
| DELETE_FOLDER | `folders.delete` | **mapped** |
| SHARE_FOLDER | `folders.share` | **mapped** |
| CREATE_SHARED_DRIVE | `sharedDrives.create` | **mapped** |
| GET_SHARED_DRIVE | `sharedDrives.get` | **mapped** |
| LIST_SHARED_DRIVES | `sharedDrives.list` | **mapped** |
| UPDATE_SHARED_DRIVE | `sharedDrives.update` | **mapped** |
| DELETE_SHARED_DRIVE | `sharedDrives.delete` | **mapped** |
| SEARCH_FILES_AND_FOLDERS | `search.filesAndFolders` | **mapped** |

Registry completeness test: `__tests__/completeness.test.ts`.
