import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { GetObjectCommand } from "@aws-sdk/client-s3"

const SPACES_KEY = process.env.DO_SPACES_KEY ?? ""
const SPACES_SECRET = process.env.DO_SPACES_SECRET ?? ""
const SPACES_ENDPOINT = process.env.DO_SPACES_ENDPOINT ?? "https://blr1.digitaloceanspaces.com"
const SPACES_BUCKET = process.env.DO_SPACES_BUCKET ?? "nodebase-media"
const SPACES_REGION = process.env.DO_SPACES_REGION ?? "blr1"
const SPACES_CDN_URL = process.env.DO_SPACES_CDN_URL ?? ""
const SAS_EXPIRY_HOURS = parseInt(
  process.env.DO_SPACES_SAS_EXPIRY_HOURS ?? "48"
)

// Lazy-initialized client (only created when actually needed)
let _s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!_s3Client) {
    if (!SPACES_KEY || !SPACES_SECRET) {
      throw new Error(
        "MediaService: DO_SPACES_KEY and DO_SPACES_SECRET must be set"
      )
    }
    _s3Client = new S3Client({
      endpoint: SPACES_ENDPOINT,
      region: SPACES_REGION,
      credentials: {
        accessKeyId: SPACES_KEY,
        secretAccessKey: SPACES_SECRET,
      },
      forcePathStyle: false, // DO Spaces requires virtual-hosted-style
    })
  }
  return _s3Client
}

export interface UploadResult {
  blobName: string // internal path (kept for backward compat)
  url: string // presigned URL valid for SAS_EXPIRY_HOURS
  mimeType: string
  sizeBytes: number
  expiresAt: string // ISO timestamp
}

export interface MediaUploadOptions {
  userId: string
  workflowId: string
  executionId?: string
  filename?: string // if not set, auto-generated from mimeType
}

// ── Core: upload from URL (fetches URL, stores permanently) ────────────────

export async function uploadFromUrl(
  sourceUrl: string,
  opts: MediaUploadOptions
): Promise<UploadResult> {
  // Validate URL — HTTPS only, block private/internal IP ranges
  const parsed = new URL(sourceUrl)
  if (parsed.protocol !== "https:") {
    throw new Error("MediaService: Only HTTPS URLs are allowed")
  }
  const blocked = ["169.254.", "10.", "172.16.", "192.168.", "127.", "localhost", "0.0.0.0"]
  const host = parsed.hostname
  if (blocked.some((b) => host.startsWith(b) || host === b.replace(/\.$/, ""))) {
    throw new Error("MediaService: Private/internal URLs are not allowed")
  }

  // Fetch the media bytes
  const response = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(60000), // 60s timeout for large images
  })

  if (!response.ok) {
    throw new Error(
      `MediaService: Failed to fetch media from URL (${response.status}): ${sourceUrl.slice(0, 100)}`
    )
  }

  const mimeType =
    response.headers.get("content-type") ?? "application/octet-stream"
  const buffer = await response.arrayBuffer()

  return uploadFromBuffer(Buffer.from(buffer), mimeType, opts)
}

// ── Core: upload from base64 string ───────────────────────────────────────

export async function uploadFromBase64(
  base64Data: string,
  mimeType: string,
  opts: MediaUploadOptions
): Promise<UploadResult> {
  // Strip data URL prefix if present: "data:image/png;base64,..."
  const stripped = base64Data.includes(",")
    ? base64Data.split(",")[1] ?? base64Data
    : base64Data

  const buffer = Buffer.from(stripped, "base64")
  return uploadFromBuffer(buffer, mimeType, opts)
}

// ── Core: upload from Buffer ───────────────────────────────────────────────

export async function uploadFromBuffer(
  buffer: Buffer,
  mimeType: string,
  opts: MediaUploadOptions
): Promise<UploadResult> {
  const ext = mimeTypeToExt(mimeType)
  const executionId = opts.executionId ?? "no-execution"

  // Sanitize filename to prevent path traversal in object storage
  const safeFilename = (opts.filename ?? `media-${Date.now()}.${ext}`)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 200)

  // Path: uploads/{userId}/{workflowId}/{executionId}/{timestamp}-{safeFilename}
  const objectKey = `uploads/${opts.userId}/${opts.workflowId}/${executionId}/${Date.now()}-${safeFilename}`

  const client = getS3Client()

  await client.send(
    new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType,
      ACL: "private",
    })
  )

  const url = await generatePresignedUrl(objectKey)
  const expiresAt = new Date(
    Date.now() + SAS_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString()

  return {
    blobName: objectKey,
    url,
    mimeType,
    sizeBytes: buffer.length,
    expiresAt,
  }
}

// ── Presigned URL generation ───────────────────────────────────────────────

async function generatePresignedUrl(objectKey: string): Promise<string> {
  const client = getS3Client()
  const expiresInSeconds = SAS_EXPIRY_HOURS * 60 * 60

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: objectKey,
    }),
    { expiresIn: expiresInSeconds }
  )

  return url
}

// ── Convenience: auto-detect source type and upload ───────────────────────

export async function uploadMedia(
  source: string, // URL, base64 data URL, or raw base64
  mimeTypeHint: string, // used if source is raw base64
  opts: MediaUploadOptions
): Promise<UploadResult> {
  if (source.startsWith("data:")) {
    // data:image/png;base64,iVBOR...
    const mimeMatch = source.match(/data:([^;]+);/)
    const mimeType = mimeMatch?.[1] ?? mimeTypeHint
    return uploadFromBase64(source, mimeType, opts)
  }

  if (source.startsWith("http://") || source.startsWith("https://")) {
    return uploadFromUrl(source, opts)
  }

  // Assume raw base64
  return uploadFromBase64(source, mimeTypeHint, opts)
}

// ── Mime type → file extension ─────────────────────────────────────────────

export function mimeTypeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "audio/mpeg": "mp3",
    "audio/mp4": "mp4",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/json": "json",
    "application/octet-stream": "bin",
  }
  return map[mimeType] ?? mimeType.split("/")[1] ?? "bin"
}

// ── Delete (called by cleanup job or on workflow delete) ───────────────────

export async function deleteWorkflowMedia(
  userId: string,
  workflowId: string
): Promise<number> {
  const client = getS3Client()
  const prefix = `uploads/${userId}/${workflowId}/`

  let deleted = 0
  let continuationToken: string | undefined

  do {
    const listResult = await client.send(
      new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    )

    const objects = listResult.Contents
    if (objects && objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: SPACES_BUCKET,
          Delete: {
            Objects: objects.map((obj) => ({ Key: obj.Key! })),
            Quiet: true,
          },
        })
      )
      deleted += objects.length
    }

    continuationToken = listResult.NextContinuationToken
  } while (continuationToken)

  return deleted
}
