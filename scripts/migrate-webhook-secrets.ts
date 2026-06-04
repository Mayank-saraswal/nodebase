/**
 * scripts/migrate-webhook-secrets.ts
 *
 * One-time data migration: encrypts all plaintext secretTokenLegacy values
 * in WebhookTrigger and stores them in secretTokenEncrypted.
 *
 * Run: npm run migrate:webhook-secrets
 *
 * Safe to re-run — skips rows that already have secretTokenEncrypted set.
 */
import { PrismaClient } from "../src/generated/prisma"
import { encrypt } from "../src/lib/encryption"

const prisma = new PrismaClient()

async function main() {
  const triggers = await prisma.webhookTrigger.findMany({
    where: {
      secretTokenEncrypted: null,
      secretTokenLegacy: { not: null },
    },
  })

  console.log(`Found ${triggers.length} trigger(s) to migrate`)

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const trigger of triggers) {
    try {
      if (!trigger.secretTokenLegacy) {
        skipped++
        continue
      }

      const encrypted = encrypt(trigger.secretTokenLegacy)
      await prisma.webhookTrigger.update({
        where: { id: trigger.id },
        data: {
          secretTokenEncrypted: encrypted,
          secretTokenLegacy: null, // clear legacy plaintext
        },
      })
      migrated++
      console.log(`  ✓ Migrated trigger ${trigger.id} (workflow: ${trigger.workflowId})`)
    } catch (err) {
      failed++
      console.error(`  ✗ Failed trigger ${trigger.id}:`, err)
    }
  }

  console.log(
    `\nMigration complete: ${migrated} migrated, ${skipped} skipped (empty secret), ${failed} failed`
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
