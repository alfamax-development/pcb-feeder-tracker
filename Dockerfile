# Stage 1: install deps and build
FROM node:20-bookworm AS builder
WORKDIR /app

# Avoid telemetry in CI/containers
ENV NEXT_TELEMETRY_DISABLED=1
# Default DB URL for Prisma generate/build (overridden by env_file at runtime)
ENV DATABASE_URL="postgresql://dev:devpass@db:5432/feederdb?schema=public"

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma client before build
RUN npx prisma generate

RUN npm run build

# Stage 2: runtime image
FROM node:20-bookworm AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://dev:devpass@db:5432/feederdb?schema=public"

# Copy only what we need to run
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "run", "start"]
