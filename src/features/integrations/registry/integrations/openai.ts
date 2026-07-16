/**
 * OpenAI registry — full @corsair-dev/openai surface (129 endpoints).
 * Generated from package nested endpoint tree.
 */

import type { IntegrationDefinition, OperationDefinition } from "../types"

export const OPENAI_CORSAIR_ENDPOINTS = [
  "models.list",
  "models.retrieve",
  "engines.list",
  "engines.retrieve",
  "chat.createCompletion",
  "embeddings.create",
  "files.upload",
  "files.list",
  "files.retrieve",
  "files.delete",
  "files.downloadContent",
  "assistants.create",
  "assistants.list",
  "assistants.retrieve",
  "assistants.modify",
  "assistants.delete",
  "threads.create",
  "threads.retrieve",
  "threads.modify",
  "threads.delete",
  "threads.createAndRun",
  "messages.create",
  "messages.list",
  "messages.retrieve",
  "messages.modify",
  "messages.delete",
  "runs.create",
  "runs.list",
  "runs.retrieve",
  "runs.modify",
  "runs.cancel",
  "runs.submitToolOutputs",
  "runSteps.list",
  "runSteps.retrieve",
  "vectorStores.create",
  "vectorStores.list",
  "vectorStores.retrieve",
  "vectorStores.modify",
  "vectorStores.delete",
  "vectorStores.search",
  "vectorStoreFiles.create",
  "vectorStoreFiles.list",
  "vectorStoreFiles.retrieve",
  "vectorStoreFiles.delete",
  "vectorStoreFiles.updateAttributes",
  "vectorStoreFiles.retrieveContent",
  "vectorStoreFileBatches.create",
  "vectorStoreFileBatches.retrieve",
  "vectorStoreFileBatches.listFiles",
  "moderation.create",
  "audio.createSpeech",
  "audio.createTranscription",
  "audio.createTranslation",
  "images.create",
  "images.createEdit",
  "images.createVariation",
  "videos.create",
  "videos.list",
  "videos.retrieve",
  "videos.delete",
  "videos.createRemix",
  "videos.download",
  "realtime.createCall",
  "realtime.createClientSecret",
  "realtime.createSession",
  "realtime.createTranscriptionSession",
  "chatkit.listThreads",
  "chatkit.getThread",
  "chatkit.listThreadItems",
  "skills.create",
  "skills.list",
  "skills.delete",
  "containers.create",
  "containers.list",
  "containers.retrieve",
  "containers.delete",
  "containerFiles.create",
  "containerFiles.list",
  "containerFiles.retrieve",
  "containerFiles.retrieveContent",
  "containerFiles.delete",
  "conversations.create",
  "conversations.update",
  "conversations.delete",
  "conversations.createItems",
  "conversations.listItems",
  "conversations.getItem",
  "conversations.deleteItem",
  "fineTuning.createJob",
  "fineTuning.listJobs",
  "fineTuning.retrieveJob",
  "fineTuning.listCheckpoints",
  "fineTuning.listEvents",
  "fineTuning.cancelJob",
  "completions.create",
  "responses.create",
  "responses.retrieve",
  "responses.delete",
  "responses.cancel",
  "responses.compact",
  "responses.listInputItems",
  "chatCompletions.list",
  "chatCompletions.retrieve",
  "chatCompletions.update",
  "chatCompletions.delete",
  "chatCompletions.listMessages",
  "tokens.countInput",
  "evals.create",
  "evals.list",
  "evals.get",
  "evals.update",
  "evals.delete",
  "evalRuns.create",
  "evalRuns.get",
  "evalRuns.list",
  "evalRuns.cancel",
  "evalRuns.delete",
  "evalRuns.getOutputItem",
  "evalRuns.listOutputItems",
  "graders.run",
  "graders.validate",
  "batches.create",
  "batches.retrieve",
  "batches.cancel",
  "batches.list",
  "uploads.create",
  "uploads.addPart",
  "uploads.complete",
  "uploads.cancel"
] as const

const OPERATIONS: OperationDefinition[] = [
  {
    "key": "models.list",
    "aliases": [
      "MODELS_LIST",
      "LIST_MODELS"
    ],
    "label": "models.list",
    "group": "models",
    "risk": "read"
  },
  {
    "key": "models.retrieve",
    "aliases": [
      "MODELS_RETRIEVE"
    ],
    "label": "models.retrieve",
    "group": "models",
    "risk": "read"
  },
  {
    "key": "engines.list",
    "aliases": [
      "ENGINES_LIST"
    ],
    "label": "engines.list",
    "group": "engines",
    "risk": "read"
  },
  {
    "key": "engines.retrieve",
    "aliases": [
      "ENGINES_RETRIEVE"
    ],
    "label": "engines.retrieve",
    "group": "engines",
    "risk": "read"
  },
  {
    "key": "chat.createCompletion",
    "aliases": [
      "CHAT_CREATE_COMPLETION",
      "CHAT",
      "CHAT_COMPLETION",
      "GENERATE_TEXT",
      "CREATE_CHAT_COMPLETION"
    ],
    "label": "chat.createCompletion",
    "group": "chat",
    "risk": "write"
  },
  {
    "key": "embeddings.create",
    "aliases": [
      "EMBEDDINGS_CREATE",
      "EMBED",
      "CREATE_EMBEDDING"
    ],
    "label": "embeddings.create",
    "group": "embeddings",
    "risk": "write"
  },
  {
    "key": "files.upload",
    "aliases": [
      "FILES_UPLOAD"
    ],
    "label": "files.upload",
    "group": "files",
    "risk": "write"
  },
  {
    "key": "files.list",
    "aliases": [
      "FILES_LIST"
    ],
    "label": "files.list",
    "group": "files",
    "risk": "read"
  },
  {
    "key": "files.retrieve",
    "aliases": [
      "FILES_RETRIEVE"
    ],
    "label": "files.retrieve",
    "group": "files",
    "risk": "read"
  },
  {
    "key": "files.delete",
    "aliases": [
      "FILES_DELETE"
    ],
    "label": "files.delete",
    "group": "files",
    "risk": "destructive"
  },
  {
    "key": "files.downloadContent",
    "aliases": [
      "FILES_DOWNLOAD_CONTENT"
    ],
    "label": "files.downloadContent",
    "group": "files",
    "risk": "read"
  },
  {
    "key": "assistants.create",
    "aliases": [
      "ASSISTANTS_CREATE"
    ],
    "label": "assistants.create",
    "group": "assistants",
    "risk": "write"
  },
  {
    "key": "assistants.list",
    "aliases": [
      "ASSISTANTS_LIST"
    ],
    "label": "assistants.list",
    "group": "assistants",
    "risk": "read"
  },
  {
    "key": "assistants.retrieve",
    "aliases": [
      "ASSISTANTS_RETRIEVE"
    ],
    "label": "assistants.retrieve",
    "group": "assistants",
    "risk": "read"
  },
  {
    "key": "assistants.modify",
    "aliases": [
      "ASSISTANTS_MODIFY"
    ],
    "label": "assistants.modify",
    "group": "assistants",
    "risk": "write"
  },
  {
    "key": "assistants.delete",
    "aliases": [
      "ASSISTANTS_DELETE"
    ],
    "label": "assistants.delete",
    "group": "assistants",
    "risk": "destructive"
  },
  {
    "key": "threads.create",
    "aliases": [
      "THREADS_CREATE"
    ],
    "label": "threads.create",
    "group": "threads",
    "risk": "write"
  },
  {
    "key": "threads.retrieve",
    "aliases": [
      "THREADS_RETRIEVE"
    ],
    "label": "threads.retrieve",
    "group": "threads",
    "risk": "read"
  },
  {
    "key": "threads.modify",
    "aliases": [
      "THREADS_MODIFY"
    ],
    "label": "threads.modify",
    "group": "threads",
    "risk": "write"
  },
  {
    "key": "threads.delete",
    "aliases": [
      "THREADS_DELETE"
    ],
    "label": "threads.delete",
    "group": "threads",
    "risk": "destructive"
  },
  {
    "key": "threads.createAndRun",
    "aliases": [
      "THREADS_CREATE_AND_RUN"
    ],
    "label": "threads.createAndRun",
    "group": "threads",
    "risk": "write"
  },
  {
    "key": "messages.create",
    "aliases": [
      "MESSAGES_CREATE"
    ],
    "label": "messages.create",
    "group": "messages",
    "risk": "write"
  },
  {
    "key": "messages.list",
    "aliases": [
      "MESSAGES_LIST"
    ],
    "label": "messages.list",
    "group": "messages",
    "risk": "read"
  },
  {
    "key": "messages.retrieve",
    "aliases": [
      "MESSAGES_RETRIEVE"
    ],
    "label": "messages.retrieve",
    "group": "messages",
    "risk": "read"
  },
  {
    "key": "messages.modify",
    "aliases": [
      "MESSAGES_MODIFY"
    ],
    "label": "messages.modify",
    "group": "messages",
    "risk": "write"
  },
  {
    "key": "messages.delete",
    "aliases": [
      "MESSAGES_DELETE"
    ],
    "label": "messages.delete",
    "group": "messages",
    "risk": "destructive"
  },
  {
    "key": "runs.create",
    "aliases": [
      "RUNS_CREATE"
    ],
    "label": "runs.create",
    "group": "runs",
    "risk": "write"
  },
  {
    "key": "runs.list",
    "aliases": [
      "RUNS_LIST"
    ],
    "label": "runs.list",
    "group": "runs",
    "risk": "read"
  },
  {
    "key": "runs.retrieve",
    "aliases": [
      "RUNS_RETRIEVE"
    ],
    "label": "runs.retrieve",
    "group": "runs",
    "risk": "read"
  },
  {
    "key": "runs.modify",
    "aliases": [
      "RUNS_MODIFY"
    ],
    "label": "runs.modify",
    "group": "runs",
    "risk": "write"
  },
  {
    "key": "runs.cancel",
    "aliases": [
      "RUNS_CANCEL"
    ],
    "label": "runs.cancel",
    "group": "runs",
    "risk": "destructive"
  },
  {
    "key": "runs.submitToolOutputs",
    "aliases": [
      "RUNS_SUBMIT_TOOL_OUTPUTS"
    ],
    "label": "runs.submitToolOutputs",
    "group": "runs",
    "risk": "write"
  },
  {
    "key": "runSteps.list",
    "aliases": [
      "RUN_STEPS_LIST"
    ],
    "label": "runSteps.list",
    "group": "runSteps",
    "risk": "read"
  },
  {
    "key": "runSteps.retrieve",
    "aliases": [
      "RUN_STEPS_RETRIEVE"
    ],
    "label": "runSteps.retrieve",
    "group": "runSteps",
    "risk": "read"
  },
  {
    "key": "vectorStores.create",
    "aliases": [
      "VECTOR_STORES_CREATE"
    ],
    "label": "vectorStores.create",
    "group": "vectorStores",
    "risk": "write"
  },
  {
    "key": "vectorStores.list",
    "aliases": [
      "VECTOR_STORES_LIST"
    ],
    "label": "vectorStores.list",
    "group": "vectorStores",
    "risk": "read"
  },
  {
    "key": "vectorStores.retrieve",
    "aliases": [
      "VECTOR_STORES_RETRIEVE"
    ],
    "label": "vectorStores.retrieve",
    "group": "vectorStores",
    "risk": "read"
  },
  {
    "key": "vectorStores.modify",
    "aliases": [
      "VECTOR_STORES_MODIFY"
    ],
    "label": "vectorStores.modify",
    "group": "vectorStores",
    "risk": "write"
  },
  {
    "key": "vectorStores.delete",
    "aliases": [
      "VECTOR_STORES_DELETE"
    ],
    "label": "vectorStores.delete",
    "group": "vectorStores",
    "risk": "destructive"
  },
  {
    "key": "vectorStores.search",
    "aliases": [
      "VECTOR_STORES_SEARCH"
    ],
    "label": "vectorStores.search",
    "group": "vectorStores",
    "risk": "read"
  },
  {
    "key": "vectorStoreFiles.create",
    "aliases": [
      "VECTOR_STORE_FILES_CREATE"
    ],
    "label": "vectorStoreFiles.create",
    "group": "vectorStoreFiles",
    "risk": "write"
  },
  {
    "key": "vectorStoreFiles.list",
    "aliases": [
      "VECTOR_STORE_FILES_LIST"
    ],
    "label": "vectorStoreFiles.list",
    "group": "vectorStoreFiles",
    "risk": "read"
  },
  {
    "key": "vectorStoreFiles.retrieve",
    "aliases": [
      "VECTOR_STORE_FILES_RETRIEVE"
    ],
    "label": "vectorStoreFiles.retrieve",
    "group": "vectorStoreFiles",
    "risk": "read"
  },
  {
    "key": "vectorStoreFiles.delete",
    "aliases": [
      "VECTOR_STORE_FILES_DELETE"
    ],
    "label": "vectorStoreFiles.delete",
    "group": "vectorStoreFiles",
    "risk": "destructive"
  },
  {
    "key": "vectorStoreFiles.updateAttributes",
    "aliases": [
      "VECTOR_STORE_FILES_UPDATE_ATTRIBUTES"
    ],
    "label": "vectorStoreFiles.updateAttributes",
    "group": "vectorStoreFiles",
    "risk": "write"
  },
  {
    "key": "vectorStoreFiles.retrieveContent",
    "aliases": [
      "VECTOR_STORE_FILES_RETRIEVE_CONTENT"
    ],
    "label": "vectorStoreFiles.retrieveContent",
    "group": "vectorStoreFiles",
    "risk": "read"
  },
  {
    "key": "vectorStoreFileBatches.create",
    "aliases": [
      "VECTOR_STORE_FILE_BATCHES_CREATE"
    ],
    "label": "vectorStoreFileBatches.create",
    "group": "vectorStoreFileBatches",
    "risk": "write"
  },
  {
    "key": "vectorStoreFileBatches.retrieve",
    "aliases": [
      "VECTOR_STORE_FILE_BATCHES_RETRIEVE"
    ],
    "label": "vectorStoreFileBatches.retrieve",
    "group": "vectorStoreFileBatches",
    "risk": "read"
  },
  {
    "key": "vectorStoreFileBatches.listFiles",
    "aliases": [
      "VECTOR_STORE_FILE_BATCHES_LIST_FILES"
    ],
    "label": "vectorStoreFileBatches.listFiles",
    "group": "vectorStoreFileBatches",
    "risk": "read"
  },
  {
    "key": "moderation.create",
    "aliases": [
      "MODERATION_CREATE",
      "MODERATE"
    ],
    "label": "moderation.create",
    "group": "moderation",
    "risk": "write"
  },
  {
    "key": "audio.createSpeech",
    "aliases": [
      "AUDIO_CREATE_SPEECH",
      "TTS",
      "SPEECH"
    ],
    "label": "audio.createSpeech",
    "group": "audio",
    "risk": "write"
  },
  {
    "key": "audio.createTranscription",
    "aliases": [
      "AUDIO_CREATE_TRANSCRIPTION",
      "TRANSCRIBE"
    ],
    "label": "audio.createTranscription",
    "group": "audio",
    "risk": "write"
  },
  {
    "key": "audio.createTranslation",
    "aliases": [
      "AUDIO_CREATE_TRANSLATION"
    ],
    "label": "audio.createTranslation",
    "group": "audio",
    "risk": "write"
  },
  {
    "key": "images.create",
    "aliases": [
      "IMAGES_CREATE",
      "IMAGE",
      "CREATE_IMAGE"
    ],
    "label": "images.create",
    "group": "images",
    "risk": "write"
  },
  {
    "key": "images.createEdit",
    "aliases": [
      "IMAGES_CREATE_EDIT"
    ],
    "label": "images.createEdit",
    "group": "images",
    "risk": "write"
  },
  {
    "key": "images.createVariation",
    "aliases": [
      "IMAGES_CREATE_VARIATION"
    ],
    "label": "images.createVariation",
    "group": "images",
    "risk": "write"
  },
  {
    "key": "videos.create",
    "aliases": [
      "VIDEOS_CREATE"
    ],
    "label": "videos.create",
    "group": "videos",
    "risk": "write"
  },
  {
    "key": "videos.list",
    "aliases": [
      "VIDEOS_LIST"
    ],
    "label": "videos.list",
    "group": "videos",
    "risk": "read"
  },
  {
    "key": "videos.retrieve",
    "aliases": [
      "VIDEOS_RETRIEVE"
    ],
    "label": "videos.retrieve",
    "group": "videos",
    "risk": "read"
  },
  {
    "key": "videos.delete",
    "aliases": [
      "VIDEOS_DELETE"
    ],
    "label": "videos.delete",
    "group": "videos",
    "risk": "destructive"
  },
  {
    "key": "videos.createRemix",
    "aliases": [
      "VIDEOS_CREATE_REMIX"
    ],
    "label": "videos.createRemix",
    "group": "videos",
    "risk": "write"
  },
  {
    "key": "videos.download",
    "aliases": [
      "VIDEOS_DOWNLOAD"
    ],
    "label": "videos.download",
    "group": "videos",
    "risk": "read"
  },
  {
    "key": "realtime.createCall",
    "aliases": [
      "REALTIME_CREATE_CALL"
    ],
    "label": "realtime.createCall",
    "group": "realtime",
    "risk": "write"
  },
  {
    "key": "realtime.createClientSecret",
    "aliases": [
      "REALTIME_CREATE_CLIENT_SECRET"
    ],
    "label": "realtime.createClientSecret",
    "group": "realtime",
    "risk": "write"
  },
  {
    "key": "realtime.createSession",
    "aliases": [
      "REALTIME_CREATE_SESSION"
    ],
    "label": "realtime.createSession",
    "group": "realtime",
    "risk": "write"
  },
  {
    "key": "realtime.createTranscriptionSession",
    "aliases": [
      "REALTIME_CREATE_TRANSCRIPTION_SESSION"
    ],
    "label": "realtime.createTranscriptionSession",
    "group": "realtime",
    "risk": "write"
  },
  {
    "key": "chatkit.listThreads",
    "aliases": [
      "CHATKIT_LIST_THREADS"
    ],
    "label": "chatkit.listThreads",
    "group": "chatkit",
    "risk": "read"
  },
  {
    "key": "chatkit.getThread",
    "aliases": [
      "CHATKIT_GET_THREAD"
    ],
    "label": "chatkit.getThread",
    "group": "chatkit",
    "risk": "read"
  },
  {
    "key": "chatkit.listThreadItems",
    "aliases": [
      "CHATKIT_LIST_THREAD_ITEMS"
    ],
    "label": "chatkit.listThreadItems",
    "group": "chatkit",
    "risk": "read"
  },
  {
    "key": "skills.create",
    "aliases": [
      "SKILLS_CREATE"
    ],
    "label": "skills.create",
    "group": "skills",
    "risk": "write"
  },
  {
    "key": "skills.list",
    "aliases": [
      "SKILLS_LIST"
    ],
    "label": "skills.list",
    "group": "skills",
    "risk": "read"
  },
  {
    "key": "skills.delete",
    "aliases": [
      "SKILLS_DELETE"
    ],
    "label": "skills.delete",
    "group": "skills",
    "risk": "destructive"
  },
  {
    "key": "containers.create",
    "aliases": [
      "CONTAINERS_CREATE"
    ],
    "label": "containers.create",
    "group": "containers",
    "risk": "write"
  },
  {
    "key": "containers.list",
    "aliases": [
      "CONTAINERS_LIST"
    ],
    "label": "containers.list",
    "group": "containers",
    "risk": "read"
  },
  {
    "key": "containers.retrieve",
    "aliases": [
      "CONTAINERS_RETRIEVE"
    ],
    "label": "containers.retrieve",
    "group": "containers",
    "risk": "read"
  },
  {
    "key": "containers.delete",
    "aliases": [
      "CONTAINERS_DELETE"
    ],
    "label": "containers.delete",
    "group": "containers",
    "risk": "destructive"
  },
  {
    "key": "containerFiles.create",
    "aliases": [
      "CONTAINER_FILES_CREATE"
    ],
    "label": "containerFiles.create",
    "group": "containerFiles",
    "risk": "write"
  },
  {
    "key": "containerFiles.list",
    "aliases": [
      "CONTAINER_FILES_LIST"
    ],
    "label": "containerFiles.list",
    "group": "containerFiles",
    "risk": "read"
  },
  {
    "key": "containerFiles.retrieve",
    "aliases": [
      "CONTAINER_FILES_RETRIEVE"
    ],
    "label": "containerFiles.retrieve",
    "group": "containerFiles",
    "risk": "read"
  },
  {
    "key": "containerFiles.retrieveContent",
    "aliases": [
      "CONTAINER_FILES_RETRIEVE_CONTENT"
    ],
    "label": "containerFiles.retrieveContent",
    "group": "containerFiles",
    "risk": "read"
  },
  {
    "key": "containerFiles.delete",
    "aliases": [
      "CONTAINER_FILES_DELETE"
    ],
    "label": "containerFiles.delete",
    "group": "containerFiles",
    "risk": "destructive"
  },
  {
    "key": "conversations.create",
    "aliases": [
      "CONVERSATIONS_CREATE"
    ],
    "label": "conversations.create",
    "group": "conversations",
    "risk": "write"
  },
  {
    "key": "conversations.update",
    "aliases": [
      "CONVERSATIONS_UPDATE"
    ],
    "label": "conversations.update",
    "group": "conversations",
    "risk": "write"
  },
  {
    "key": "conversations.delete",
    "aliases": [
      "CONVERSATIONS_DELETE"
    ],
    "label": "conversations.delete",
    "group": "conversations",
    "risk": "destructive"
  },
  {
    "key": "conversations.createItems",
    "aliases": [
      "CONVERSATIONS_CREATE_ITEMS"
    ],
    "label": "conversations.createItems",
    "group": "conversations",
    "risk": "write"
  },
  {
    "key": "conversations.listItems",
    "aliases": [
      "CONVERSATIONS_LIST_ITEMS"
    ],
    "label": "conversations.listItems",
    "group": "conversations",
    "risk": "read"
  },
  {
    "key": "conversations.getItem",
    "aliases": [
      "CONVERSATIONS_GET_ITEM"
    ],
    "label": "conversations.getItem",
    "group": "conversations",
    "risk": "read"
  },
  {
    "key": "conversations.deleteItem",
    "aliases": [
      "CONVERSATIONS_DELETE_ITEM"
    ],
    "label": "conversations.deleteItem",
    "group": "conversations",
    "risk": "destructive"
  },
  {
    "key": "fineTuning.createJob",
    "aliases": [
      "FINE_TUNING_CREATE_JOB"
    ],
    "label": "fineTuning.createJob",
    "group": "fineTuning",
    "risk": "write"
  },
  {
    "key": "fineTuning.listJobs",
    "aliases": [
      "FINE_TUNING_LIST_JOBS"
    ],
    "label": "fineTuning.listJobs",
    "group": "fineTuning",
    "risk": "read"
  },
  {
    "key": "fineTuning.retrieveJob",
    "aliases": [
      "FINE_TUNING_RETRIEVE_JOB"
    ],
    "label": "fineTuning.retrieveJob",
    "group": "fineTuning",
    "risk": "read"
  },
  {
    "key": "fineTuning.listCheckpoints",
    "aliases": [
      "FINE_TUNING_LIST_CHECKPOINTS"
    ],
    "label": "fineTuning.listCheckpoints",
    "group": "fineTuning",
    "risk": "read"
  },
  {
    "key": "fineTuning.listEvents",
    "aliases": [
      "FINE_TUNING_LIST_EVENTS"
    ],
    "label": "fineTuning.listEvents",
    "group": "fineTuning",
    "risk": "read"
  },
  {
    "key": "fineTuning.cancelJob",
    "aliases": [
      "FINE_TUNING_CANCEL_JOB"
    ],
    "label": "fineTuning.cancelJob",
    "group": "fineTuning",
    "risk": "destructive"
  },
  {
    "key": "completions.create",
    "aliases": [
      "COMPLETIONS_CREATE",
      "COMPLETION"
    ],
    "label": "completions.create",
    "group": "completions",
    "risk": "write"
  },
  {
    "key": "responses.create",
    "aliases": [
      "RESPONSES_CREATE"
    ],
    "label": "responses.create",
    "group": "responses",
    "risk": "write"
  },
  {
    "key": "responses.retrieve",
    "aliases": [
      "RESPONSES_RETRIEVE"
    ],
    "label": "responses.retrieve",
    "group": "responses",
    "risk": "read"
  },
  {
    "key": "responses.delete",
    "aliases": [
      "RESPONSES_DELETE"
    ],
    "label": "responses.delete",
    "group": "responses",
    "risk": "destructive"
  },
  {
    "key": "responses.cancel",
    "aliases": [
      "RESPONSES_CANCEL"
    ],
    "label": "responses.cancel",
    "group": "responses",
    "risk": "destructive"
  },
  {
    "key": "responses.compact",
    "aliases": [
      "RESPONSES_COMPACT"
    ],
    "label": "responses.compact",
    "group": "responses",
    "risk": "write"
  },
  {
    "key": "responses.listInputItems",
    "aliases": [
      "RESPONSES_LIST_INPUT_ITEMS"
    ],
    "label": "responses.listInputItems",
    "group": "responses",
    "risk": "read"
  },
  {
    "key": "chatCompletions.list",
    "aliases": [
      "CHAT_COMPLETIONS_LIST"
    ],
    "label": "chatCompletions.list",
    "group": "chatCompletions",
    "risk": "read"
  },
  {
    "key": "chatCompletions.retrieve",
    "aliases": [
      "CHAT_COMPLETIONS_RETRIEVE"
    ],
    "label": "chatCompletions.retrieve",
    "group": "chatCompletions",
    "risk": "read"
  },
  {
    "key": "chatCompletions.update",
    "aliases": [
      "CHAT_COMPLETIONS_UPDATE"
    ],
    "label": "chatCompletions.update",
    "group": "chatCompletions",
    "risk": "write"
  },
  {
    "key": "chatCompletions.delete",
    "aliases": [
      "CHAT_COMPLETIONS_DELETE"
    ],
    "label": "chatCompletions.delete",
    "group": "chatCompletions",
    "risk": "destructive"
  },
  {
    "key": "chatCompletions.listMessages",
    "aliases": [
      "CHAT_COMPLETIONS_LIST_MESSAGES"
    ],
    "label": "chatCompletions.listMessages",
    "group": "chatCompletions",
    "risk": "read"
  },
  {
    "key": "tokens.countInput",
    "aliases": [
      "TOKENS_COUNT_INPUT"
    ],
    "label": "tokens.countInput",
    "group": "tokens",
    "risk": "read"
  },
  {
    "key": "evals.create",
    "aliases": [
      "EVALS_CREATE"
    ],
    "label": "evals.create",
    "group": "evals",
    "risk": "write"
  },
  {
    "key": "evals.list",
    "aliases": [
      "EVALS_LIST"
    ],
    "label": "evals.list",
    "group": "evals",
    "risk": "read"
  },
  {
    "key": "evals.get",
    "aliases": [
      "EVALS_GET"
    ],
    "label": "evals.get",
    "group": "evals",
    "risk": "read"
  },
  {
    "key": "evals.update",
    "aliases": [
      "EVALS_UPDATE"
    ],
    "label": "evals.update",
    "group": "evals",
    "risk": "write"
  },
  {
    "key": "evals.delete",
    "aliases": [
      "EVALS_DELETE"
    ],
    "label": "evals.delete",
    "group": "evals",
    "risk": "destructive"
  },
  {
    "key": "evalRuns.create",
    "aliases": [
      "EVAL_RUNS_CREATE"
    ],
    "label": "evalRuns.create",
    "group": "evalRuns",
    "risk": "write"
  },
  {
    "key": "evalRuns.get",
    "aliases": [
      "EVAL_RUNS_GET"
    ],
    "label": "evalRuns.get",
    "group": "evalRuns",
    "risk": "read"
  },
  {
    "key": "evalRuns.list",
    "aliases": [
      "EVAL_RUNS_LIST"
    ],
    "label": "evalRuns.list",
    "group": "evalRuns",
    "risk": "read"
  },
  {
    "key": "evalRuns.cancel",
    "aliases": [
      "EVAL_RUNS_CANCEL"
    ],
    "label": "evalRuns.cancel",
    "group": "evalRuns",
    "risk": "destructive"
  },
  {
    "key": "evalRuns.delete",
    "aliases": [
      "EVAL_RUNS_DELETE"
    ],
    "label": "evalRuns.delete",
    "group": "evalRuns",
    "risk": "destructive"
  },
  {
    "key": "evalRuns.getOutputItem",
    "aliases": [
      "EVAL_RUNS_GET_OUTPUT_ITEM"
    ],
    "label": "evalRuns.getOutputItem",
    "group": "evalRuns",
    "risk": "read"
  },
  {
    "key": "evalRuns.listOutputItems",
    "aliases": [
      "EVAL_RUNS_LIST_OUTPUT_ITEMS"
    ],
    "label": "evalRuns.listOutputItems",
    "group": "evalRuns",
    "risk": "read"
  },
  {
    "key": "graders.run",
    "aliases": [
      "GRADERS_RUN"
    ],
    "label": "graders.run",
    "group": "graders",
    "risk": "write"
  },
  {
    "key": "graders.validate",
    "aliases": [
      "GRADERS_VALIDATE"
    ],
    "label": "graders.validate",
    "group": "graders",
    "risk": "read"
  },
  {
    "key": "batches.create",
    "aliases": [
      "BATCHES_CREATE"
    ],
    "label": "batches.create",
    "group": "batches",
    "risk": "write"
  },
  {
    "key": "batches.retrieve",
    "aliases": [
      "BATCHES_RETRIEVE"
    ],
    "label": "batches.retrieve",
    "group": "batches",
    "risk": "read"
  },
  {
    "key": "batches.cancel",
    "aliases": [
      "BATCHES_CANCEL"
    ],
    "label": "batches.cancel",
    "group": "batches",
    "risk": "destructive"
  },
  {
    "key": "batches.list",
    "aliases": [
      "BATCHES_LIST"
    ],
    "label": "batches.list",
    "group": "batches",
    "risk": "read"
  },
  {
    "key": "uploads.create",
    "aliases": [
      "UPLOADS_CREATE"
    ],
    "label": "uploads.create",
    "group": "uploads",
    "risk": "write"
  },
  {
    "key": "uploads.addPart",
    "aliases": [
      "UPLOADS_ADD_PART"
    ],
    "label": "uploads.addPart",
    "group": "uploads",
    "risk": "write"
  },
  {
    "key": "uploads.complete",
    "aliases": [
      "UPLOADS_COMPLETE"
    ],
    "label": "uploads.complete",
    "group": "uploads",
    "risk": "write"
  },
  {
    "key": "uploads.cancel",
    "aliases": [
      "UPLOADS_CANCEL"
    ],
    "label": "uploads.cancel",
    "group": "uploads",
    "risk": "destructive"
  }
] as OperationDefinition[]

export const openaiIntegrationDefinition: IntegrationDefinition = {
  typeKey: "openai",
  kind: "integration",
  corsairPluginId: "openai",
  label: "OpenAI",
  operations: OPERATIONS,
}
