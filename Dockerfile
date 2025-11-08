# Single-stage build - build and run in the same container
FROM node:18-alpine

# Install dependencies for building
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Set proper permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000

# Smart database initialization (idempotent operations)
CMD ["sh", "-c", "echo 'Checking database connection...' && npx prisma db push --accept-data-loss && echo 'Seeding database...' && npm run db:seed || echo 'Seed data already exists or seeding failed' && echo 'Starting DeepWiki application...' && npm start"]
