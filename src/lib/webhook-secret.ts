import { encrypt, decrypt } from "@/lib/encryption"

// ─── TODO (future cleanup) ────────────────────────────────────────────────────
// Once all WebhookTrigger rows have been migrated (secretTokenLegacy IS NULL for
// every row), do the following in a new PR:
//   1. Create a migration: ALTER COLUMN "secretTokenEncrypted" SET NOT NULL;
//                          DROP COLUMN "secretTokenLegacy";
//   2. Remove the `webhookSecretLegacy` parameter and branch below.
//   3. Remove the console.warn call.
//   4. Delete scripts/migrate-webhook-secrets.ts.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encrypt a webhook secret for storage in `secretTokenEncrypted`.
 * Always call this before persisting a new or updated secret.
 */
export function encryptWebhookSecret(plaintext: string): string {
  return encrypt(plaintext)
}

/**
 * Decrypt a WebhookTrigger secret.
 *
 * Supports two formats:
 *   1. New format  — AES-256 ciphertext stored in `secretTokenEncrypted`
 *   2. Legacy format — plaintext stored in `secretTokenLegacy` (pre-migration rows)
 *
 * Returns the plaintext secret.
 */
export function decryptWebhookSecret(
  secretTokenEncrypted: string | null | undefined,
  secretTokenLegacy: string | null | undefined
): string {
  // Prefer the new encrypted field
  if (secretTokenEncrypted) {
    return decrypt(secretTokenEncrypted)
  }

  // Fall back to legacy plaintext (present on rows not yet migrated)
  if (secretTokenLegacy) {
    console.warn(
      "[WebhookTrigger] Using legacy plaintext secretToken — " +
        "run `npm run migrate:webhook-secrets` to encrypt it."
    )
    return secretTokenLegacy
  }

  throw new Error(
    "WebhookTrigger: No webhook secret configured."
  )
}
