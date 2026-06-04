import { defineConfig } from '@prisma/config'
import 'dotenv/config'

// Fallback for DIRECT_DATABASE_URL if it's not provided
process.env.DIRECT_DATABASE_URL = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema",
})
