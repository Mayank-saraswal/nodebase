FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile=false

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Dummy env vars so Next.js can build without real credentials
# Real values are injected at runtime by DigitalOcean App Platform
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy"
ENV DIRECT_DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy"
ENV BETTER_AUTH_SECRET="dummy-secret-for-build-only"
ENV BETTER_AUTH_URL="https://nodebase.tech"
ENV NEXT_PUBLIC_BETTER_AUTH_URL="https://nodebase.tech"
ENV NEXT_PUBLIC_APP_URL="https://nodebase.tech"
ENV GOOGLE_CLIENT_ID="dummy"
ENV GOOGLE_CLIENT_SECRET="dummy"
ENV GOOGLE_GMAIL_CLIENT_ID="dummy"
ENV GOOGLE_GMAIL_CLIENT_SECRET="dummy"
ENV GOOGLE_SHEETS_CLIENT_ID="dummy"
ENV GOOGLE_SHEETS_CLIENT_SECRET="dummy"
ENV GOOGLE_DRIVE_CLIENT_ID="dummy"
ENV GOOGLE_DRIVE_CLIENT_SECRET="dummy"
ENV GITHUB_CLIENT_ID="dummy"
ENV GITHUB_CLIENT_SECRET="dummy"
ENV INNGEST_SIGNING_KEY="signkey-prod-dummy"
ENV INNGEST_EVENT_KEY="dummy"
ENV ENCRYPTION_KEY="dummy-encryption-key-32-characters!!"
ENV SENTRY_AUTH_TOKEN="dummy"
ENV POLAR_ACCESS_TOKEN="dummy"
ENV POLAR_WEBHOOK_SECRET="dummy"
ENV GROQ_API_KEY="dummy"
ENV GOOGLE_GENERATIVE_AI_API_KEY="dummy"

# Increase Node.js heap size to prevent OOM during type checking
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Production image — minimal size
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/public ./public

# Standalone mode copies only what's needed
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]