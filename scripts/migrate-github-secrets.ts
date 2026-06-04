/**
 * scripts/migrate-github-secrets.ts
 *
 * One-time data migration: encrypts all plaintext webhookSecret values
 * in GitHubTriggerNode and stores them in webhookSecretEncrypted.
 *
 * Run: npm run migrate:github-secrets
 *
 * Safe to re-run — skips rows that already have webhookSecretEncrypted set.
 */
import { PrismaClient } from "../src/generated/prisma"
import { encrypt } from "../src/lib/encryption"

const prisma = new PrismaClient()

async function main() {
  const triggers = await prisma.gitHubTriggerNode.findMany({
    where: {
      webhookSecretEncrypted: null,
      webhookSecret: { not: null },
    },
  })

  console.log(`Found ${triggers.length} GitHub trigger(s) to migrate`)

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const trigger of triggers) {
    try {
      if (!trigger.webhookSecret) {
        skipped++
        continue
      }

      const encrypted = encrypt(trigger.webhookSecret)

      // Use updateMany with conditional where to prevent race conditions:
      // only update if webhookSecretEncrypted is still null
      const result = await prisma.gitHubTriggerNode.updateMany({
        where: {
          id: trigger.id,
          webhookSecretEncrypted: null,
        },
        data: {
          webhookSecretEncrypted: encrypted,
          webhookSecret: null,
        },
      })

      if (result.count > 0) {
        migrated++
        console.log(`  ✓ Migrated trigger ${trigger.id} (workflow: ${trigger.workflowId})`)
      } else {
        skipped++
        console.log(`  – Skipped trigger ${trigger.id} (already migrated by concurrent process)`)
      }
    } catch (err) {
      failed++
      console.error(`  ✗ Failed trigger ${trigger.id}:`, err)
    }
  }

  console.log(
    `\nMigration complete: ${migrated} migrated, ${skipped} skipped, ${failed} failed`
  )

  if (failed > 0) {
    console.error("Some triggers failed to migrate. Check errors above.")
    process.exit(1)
  }
}

main()
  .catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
