# Multi-stage build for optimized offline deployment
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies including dev dependencies for build
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client (this downloads all necessary binaries)
RUN npx prisma generate

# Pre-download Prisma migration engine for offline use
RUN npx prisma migrate download || echo "No migrations to download"

# Copy Prisma binaries to ensure they're available in final image
RUN mkdir -p ./prisma-binaries && \
    find node_modules/@prisma -name "*.node" -type f -exec cp {} ./prisma-binaries/ \; && \
    cp -r node_modules/.prisma ./prisma-binaries/ 2>/dev/null || echo "No .prisma directory found"

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Ensure public directory exists (may be required by Next.js standalone output)
RUN mkdir -p ./public

# Production stage
FROM node:18-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache libc6-compat openssl dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Copy public directory (now guaranteed to exist)
COPY --from=builder /app/public ./public

# Copy Prisma related files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma-binaries ./prisma-binaries

# Copy Prisma client from node_modules
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Ensure Prisma CLI is available and binaries are accessible
RUN mkdir -p node_modules/.prisma && \
    cp -r prisma-binaries/* node_modules/.prisma/ && \
    chmod +x node_modules/.prisma/client-* 2>/dev/null || true

# Set proper permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Smart database initialization (idempotent operations)
CMD ["dumb-init", "sh", "-c", "echo 'Starting DeepWiki application...' && echo 'Database connection will be established on first access...' && npm start"]
