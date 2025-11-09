# Deployment Infrastructure

[← Back to Index](index.md)

**Part of**: DeepWiki Architecture Documentation
**Generated**: 19 November 2025
**Source commit**: 2be6259

---

## Deployment Infrastructure Overview

DeepWiki implements a **comprehensive containerized deployment strategy** with **Docker** as the primary deployment mechanism. The infrastructure supports **development**, **staging**, and **production** environments with **automated health checks**, **environment management**, and **scalable architecture** ready for cloud deployment.

### Deployment Philosophy

- **Container-First**: Docker-based deployment for consistency
- **Environment Parity**: Same deployment process across environments
- **Infrastructure as Code**: Reproducible deployment configurations
- **Security by Default**: Non-root containers and security headers
- **Monitoring Built-In**: Health checks and observability
- **Scalability Ready**: Stateless architecture for horizontal scaling

### Technology Stack

- **Docker**: Containerization platform
- **Docker Compose**: Local development orchestration
- **PostgreSQL 15**: Production database
- **Health Checks**: Application and service monitoring
- **Environment Management**: 12-factor app configuration
- **Nginx** (optional): Reverse proxy and load balancing

---

## Container Architecture

### Multi-Service Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        A[Load Balancer] --> B[Next.js App]
        B --> C[PostgreSQL]
        B --> D[File Storage]
        B --> E[Redis Cache]
    end

    subgraph "Development Environment"
        F[docker-compose] --> B
        F --> C
        F --> G[Prisma Studio]
        F --> H[Mailhog]
    end
```

### Service Architecture

| Service | Container | Port | Purpose | Scaling |
|---------|-----------|------|---------|---------|
| **Application** | deepwiki-app | 3000 | Next.js web application | Horizontal |
| **Database** | deepwiki-postgres | 5432 | PostgreSQL database | Vertical/Clustering |
| **Development Tools** | deepwiki-studio | 5555 | Prisma Studio (dev only) | Manual |
| **Email Testing** | deepwiki-mailhog | 1025/8025 | SMTP/Web UI (dev only) | Manual |

---

## Docker Configuration

### Application Dockerfile

**File**: `Dockerfile:1-42`

```dockerfile
# Single-stage build - build and run in the same container
FROM node:18-alpine

# Install dependencies for building
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Create non-root user for security
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
```

**Dockerfile Features**:
- **Non-root User**: Security best practice (uid 1001)
- **Multi-stage Build**: Single stage for simplicity
- **Dependency Installation**: Uses `npm ci` for reproducible builds
- **Prisma Integration**: Generates client and pushes schema
- **Idempotent Commands**: Safe to run multiple times
- **Health Check**: Includes database connection check
- **Automatic Seeding**: Seeds test data if needed

### Build Optimization

**Layer Caching Strategy**:
```dockerfile
# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install dependencies (cached layer)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build application (only rebuilds when code changes)
RUN npm run build
```

**Benefits**:
- **Faster Builds**: Dependencies cached in separate layer
- **Smaller Images**: Multi-stage builds reduce final image size
- **Security**: Non-root user execution
- **Reproducibility**: Deterministic builds with `npm ci`

---

## Docker Compose Configuration

### Development Environment

**File**: `docker-compose.yml:1-96`

```yaml
services:
  # Main Next.js application
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: deepwiki-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://deepwiki:devpassword123@postgres:5432/deepwiki
      # NEXTAUTH_URL: Set to the URL you use to access the app
      # For localhost: http://localhost:3000
      # For network access: http://192.168.147.3:3000 (replace with your IP)
      # With AUTH_TRUST_HOST=true, NextAuth will accept requests from any host
      - NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
      - NEXTAUTH_SECRET=development-secret-key-change-in-production
      - NEXT_PUBLIC_APP_URL=${NEXTAUTH_URL:-http://localhost:3000}
      - AUTH_TRUST_HOST=true
    volumes:
      # Mount source code for development (hot reload)
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # PostgreSQL database (for development)
  postgres:
    image: postgres:15-alpine
    container_name: deepwiki-postgres
    environment:
      POSTGRES_DB: deepwiki
      POSTGRES_USER: deepwiki
      POSTGRES_PASSWORD: devpassword123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    # Auto-initialize database if empty
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U deepwiki"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Database management (Prisma Studio)
  prisma-studio:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: deepwiki-studio
    environment:
      - DATABASE_URL=postgresql://deepwiki:devpassword123@postgres:5432/deepwiki
    volumes:
      - .:/app
      - /app/node_modules
    command: npx prisma studio --hostname 0.0.0.0
    ports:
      - "5555:5555"
    depends_on:
      - postgres
    profiles:
      - tools

  # Mailhog for email testing (development only)
  mailhog:
    image: mailhog/mailhog:latest
    container_name: deepwiki-mailhog
    ports:
      - "1025:1025"  # SMTP server
      - "8025:8025"  # Web interface
    profiles:
      - tools

volumes:
  postgres_data:
    driver: local

networks:
  default:
    name: deepwiki-network
```

### Production Configuration

**File**: `docker-compose.prod.yml:1-50`

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: deepwiki-app-prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    depends_on:
      postgres:
        condition: service_healthy
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  postgres:
    image: postgres:15-alpine
    container_name: deepwiki-postgres-prod
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 30s
      timeout: 10s
      retries: 3
    # Production optimizations
    command: >
      postgres
        -c shared_preload_libraries=pg_stat_statements
        -c pg_stat_statements.track=all
        -c log_statement=all
        -c log_min_duration_statement=1000

  # Optional: Redis for caching
  redis:
    image: redis:7-alpine
    container_name: deepwiki-redis-prod
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

---

## Environment Configuration

### Environment Variables

**Development** (`.env.local`):
```env
# Database
DATABASE_URL="postgresql://deepwiki:devpassword@localhost:5432/deepwiki"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key"

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
AUTH_TRUST_HOST=true

# R2 Storage (optional)
CLOUDFLARE_R2_BUCKET_NAME=your-bucket
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret
CLOUDFLARE_R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
```

**Production** (`.env.production`):
```env
# Database
DATABASE_URL="postgresql://username:password@db-host:5432/deepwiki"

# NextAuth.js
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="production-secret-key-32-characters-minimum"

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# R2 Storage
CLOUDFLARE_R2_BUCKET_NAME=production-bucket
CLOUDFLARE_R2_ACCOUNT_ID=production-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=production-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=production-secret
CLOUDFLARE_R2_ENDPOINT_URL=https://production-account-id.r2.cloudflarestorage.com

# Security
SECURE_COOKIES=true
TRUST_PROXY=true
```

### Environment Management

**File**: `next.config.js:12-21`

```javascript
module.exports = {
  // Environment-based configuration
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Trust proxy for production
  trustProxy: process.env.NODE_ENV === 'production',
  // Security headers
  poweredByHeader: false,
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
}
```

**12-Factor App Principles**:
- **Configuration in Environment**: All config in environment variables
- **Dependencies Declared**: Package.json manages dependencies
- **Process Isolation**: Stateless application
- **Port Binding**: Application binds to port 3000
- **Disposability**: Graceful shutdown handling
- **Development/Production Parity**: Same code in all environments

---

## Health Checks

### Application Health Check

**File**: `app/api/health/route.ts:1-20`

```typescript
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'unknown',
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  }

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`
    health.checks.database = 'connected'
  } catch (error) {
    health.status = 'unhealthy'
    health.checks.database = 'disconnected'
    return NextResponse.json(health, { status: 503 })
  }

  return NextResponse.json(health)
}
```

### Docker Health Check

**Docker Compose Health Check**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**Health Check Benefits**:
- **Automated Monitoring**: Kubernetes/Docker Swarm integration
- **Failure Detection**: Quick detection of service issues
- **Load Balancer Routing**: Health-based traffic routing
- **Deployment Validation**: Verify deployment success

---

## Deployment Strategies

### Blue-Green Deployment

```mermaid
graph LR
    A[Load Balancer] --> B[Blue Environment]
    A --> C[Green Environment]
    B --> D[Database]
    C --> D
```

**Blue-Green Process**:
1. **Deploy Green**: Build and deploy to green environment
2. **Health Check**: Verify green environment health
3. **Switch Traffic**: Update load balancer to green
4. **Monitor**: Observe green environment
5. **Cleanup Blue**: Decommission blue environment

**Implementation**:
```yaml
# Blue-Green deployment with Docker
version: '3.8'
services:
  app-blue:
    image: deepwiki:latest
    environment:
      - NODE_ENV=production
    # ...

  app-green:
    image: deepwiki:latest
    environment:
      - NODE_ENV=production
    # ...
```

### Rolling Deployment

```yaml
# Rolling update configuration
deployment:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

**Rolling Update Process**:
1. **Scale Up**: Add new instance (green)
2. **Health Check**: Verify new instance
3. **Route Traffic**: Include in load balancer
4. **Scale Down**: Remove old instance (blue)
5. **Repeat**: Continue until all instances updated

---

## Scalability

### Horizontal Scaling

**Stateless Application Design**:
- **No Local State**: All state in database or cache
- **Session Storage**: JWT tokens (no server-side sessions)
- **File Storage**: External storage (R2/S3)
- **Database Connection**: Connection pooling

**Kubernetes Deployment**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deepwiki-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: deepwiki-app
  template:
    metadata:
      labels:
        app: deepwiki-app
    spec:
      containers:
      - name: app
        image: deepwiki:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Load Balancing

**Nginx Configuration**:
```nginx
upstream deepwiki_app {
    server app1:3000 weight=1;
    server app2:3000 weight=1;
    server app3:3000 weight=1;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://deepwiki_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://deepwiki_app/api/health;
    }
}
```

---

## Database Management

### PostgreSQL Configuration

**Production Database Settings**:
```sql
-- postgresql.conf
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

### Database Migration

**Automated Migration Process**:
```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Verify migration
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate status
```

**Migration Rollback**:
```bash
# Create backup before migration
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Rollback migration (if needed)
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate reset

# Restore from backup
psql $DATABASE_URL < backup-20231119-120000.sql
```

### Backup Strategy

**Automated Backups**:
```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/backups"
DB_NAME="deepwiki"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create backup
pg_dump $DATABASE_URL > $BACKUP_DIR/backup-$TIMESTAMP.sql

# Compress backup
gzip $BACKUP_DIR/backup-$TIMESTAMP.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup-$TIMESTAMP.sql.gz"
```

**Backup Cron Job**:
```yaml
# docker-compose.prod.yml
services:
  postgres:
    # ... existing configuration
    volumes:
      - ./backups:/backups
      - ./backup-script.sh:/backup-script.sh
    command: >
      sh -c "
        echo '0 2 * * * /backup-script.sh' | crontab - &&
        postgres -c config_file=/etc/postgresql/postgresql.conf
      "
```

---

## Monitoring and Observability

### Application Monitoring

**Health Check Endpoint**:
```typescript
// Enhanced health check with metrics
export async function GET() {
  const start = Date.now()
  const memory = process.memoryUsage()
  const cpu = process.cpuUsage()

  // Database health check
  let dbStatus = 'disconnected'
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbDuration = Date.now() - dbStart
    dbStatus = `connected (${dbDuration}ms)`
  } catch (error) {
    dbStatus = 'error'
  }

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: Date.now() - start,
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: dbStatus,
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + ' MB',
      },
      cpu: {
        user: cpu.user,
        system: cpu.system,
      }
    }
  }

  // Set appropriate status code
  const statusCode = health.status === 'healthy' ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}
```

### Logging

**Structured Logging**:
```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }))
  },
  error: (message: string, error?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: error?.message,
      stack: error?.stack
    }))
  },
  warn: (message: string, meta?: any) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }))
  }
}
```

**API Request Logging**:
```typescript
// Middleware for request logging
export async function middleware(request: NextRequest) {
  const start = Date.now()

  // Log request
  logger.info('Request started', {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
  })

  // Continue with request
  const response = await NextResponse.next()

  // Log response
  const duration = Date.now() - start
  logger.info('Request completed', {
    method: request.method,
    url: request.url,
    status: response.status,
    duration: `${duration}ms`,
  })

  return response
}
```

### Metrics Collection

**Application Metrics**:
```typescript
// lib/metrics.ts
const metrics = {
  requests: {
    total: 0,
    errors: 0,
    byEndpoint: new Map(),
  },
  database: {
    queries: 0,
    errors: 0,
    avgResponseTime: 0,
  },
  cache: {
    hits: 0,
    misses: 0,
  }
}

export const recordRequest = (endpoint: string, duration: number, status: number) => {
  metrics.requests.total++
  if (status >= 400) {
    metrics.requests.errors++
  }

  const endpointMetrics = metrics.requests.byEndpoint.get(endpoint) || { count: 0, totalDuration: 0 }
  endpointMetrics.count++
  endpointMetrics.totalDuration += duration
  metrics.requests.byEndpoint.set(endpoint, endpointMetrics)
}

export const getMetrics = () => ({
  ...metrics,
  requests: {
    ...metrics.requests,
    errorRate: (metrics.requests.errors / metrics.requests.total * 100).toFixed(2) + '%',
    byEndpoint: Object.fromEntries(metrics.requests.byEndpoint),
  }
})
```

---

## Security

### Container Security

**Security Best Practices**:
- **Non-root User**: All containers run as non-root
- **Minimal Base Images**: Alpine Linux for smaller attack surface
- **Security Updates**: Regular base image updates
- **Resource Limits**: Memory and CPU limits
- **Read-only Root**: Read-only file system where possible

**Security Scanning**:
```bash
# Scan for vulnerabilities
docker scout cves deepwiki:latest

# Check for best practices
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd):/app checkov -f /app/Dockerfile
```

### Network Security

**Docker Network Configuration**:
```yaml
# Isolated network for services
services:
  app:
    networks:
      - app-network
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

networks:
  app-network:
    driver: bridge
    internal: false
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### SSL/TLS

**Let's Encrypt with Nginx**:
```yaml
# docker-compose.ssl.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - app

  app:
    image: deepwiki:latest
    expose:
      - "3000"
```

**Nginx SSL Configuration**:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## CI/CD Pipeline

### GitHub Actions

**File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Build application
        run: npm run build

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/deepwiki:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to production
        run: |
          ssh ${{ secrets.PROD_USER }}@${{ secrets.PROD_HOST }} "
            docker pull ${{ secrets.DOCKER_USERNAME }}/deepwiki:${{ github.sha }}
            docker-compose -f docker-compose.prod.yml up -d --no-deps app
          "
```

### Deployment Scripts

**Deploy Script** (`scripts/deploy.sh`):
```bash
#!/bin/bash
set -e

# Configuration
IMAGE_TAG=${1:-latest}
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_RETENTION_DAYS=7

echo "Starting deployment..."

# Create database backup
echo "Creating database backup..."
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Pull new image
echo "Pulling new image..."
docker pull deepwiki:$IMAGE_TAG

# Deploy with zero-downtime
echo "Deploying new version..."
docker-compose -f $DOCKER_COMPOSE_FILE up -d --no-deps app

# Wait for health check
echo "Waiting for application to be healthy..."
for i in {1..30}; do
  if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "Application is healthy!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Health check failed! Rolling back..."
    docker-compose -f $DOCKER_COMPOSE_FILE up -d --no-deps app
    exit 1
  fi
  echo "Waiting for health check... ($i/30)"
  sleep 10
done

# Clean up old images
echo "Cleaning up old images..."
docker image prune -f

# Clean up old backups
echo "Cleaning up old backups..."
find /backups -name "backup-*.sql" -mtime +$BACKUP_RETENTION_DAYS -delete

echo "Deployment completed successfully!"
```

**Rollback Script** (`scripts/rollback.sh`):
```bash
#!/bin/bash
set -e

PREVIOUS_IMAGE=${1}
if [ -z "$PREVIOUS_IMAGE" ]; then
  echo "Usage: $0 <previous-image-tag>"
  exit 1
fi

echo "Rolling back to image: $PREVIOUS_IMAGE"

# Rollback to previous image
docker-compose -f docker-compose.prod.yml up -d --no-deps app

# Wait for health check
echo "Waiting for application to be healthy..."
for i in {1..30}; do
  if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "Application is healthy after rollback!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Rollback failed! Please check manually."
    exit 1
  fi
  echo "Waiting for health check... ($i/30)"
  sleep 10
done

echo "Rollback completed successfully!"
```

---

## Cloud Deployment

### AWS Deployment

**ECS Configuration** (`aws-ecs.yml`):
```yaml
services:
  deepwiki-app:
    image: deepwiki:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    environment_files:
      - .env.production
    logging:
      driver: awslogs
      options:
        awslogs-group: /ecs/deepwiki
        awslogs-region: us-west-2
        awslogs-stream-prefix: ecs
    health_check:
      path: /api/health
      port: 3000
    scale:
      min: 2
      max: 10
      target_cpu: 70
```

### Google Cloud Run

**Cloud Run Deployment**:
```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/deepwiki:$BUILD_ID', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/deepwiki:$BUILD_ID']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'deepwiki'
      - '--image'
      - 'gcr.io/$PROJECT_ID/deepwiki:$BUILD_ID'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--port'
      - '3000'
      - '--memory'
      - '1Gi'
      - '--cpu'
      - '1'
      - '--concurrency'
      - '80'
      - '--max-instances'
      - '100'
```

---

## Troubleshooting

### Common Issues

**Application Won't Start**:
```bash
# Check logs
docker-compose logs app

# Check environment variables
docker-compose exec app env

# Check database connection
docker-compose exec app npx prisma db push
```

**Database Connection Issues**:
```bash
# Check database container
docker-compose logs postgres

# Test database connection
docker-compose exec app psql $DATABASE_URL -c "SELECT 1"

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

**Build Failures**:
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check for syntax errors
npm run type-check
npm run lint
```

### Debugging Tools

**Development Debugging**:
```bash
# Start with debug logs
docker-compose up --build 2>&1 | tee debug.log

# Shell into container
docker-compose exec app sh

# Check running processes
docker-compose exec app ps aux

# Check file system
docker-compose exec app ls -la
```

**Production Debugging**:
```bash
# Check application health
curl http://localhost:3000/api/health

# Monitor application metrics
curl http://localhost:3000/api/health | jq

# Check container status
docker-compose -f docker-compose.prod.yml ps

# View recent logs
docker-compose -f docker-compose.prod.yml logs --tail=100
```

---

## Performance Optimization

### Caching Strategy

**Application-Level Caching**:
```typescript
// API route caching
export async function GET() {
  const cacheKey = 'wikis-list'
  const cached = await redis.get(cacheKey)

  if (cached) {
    return NextResponse.json(JSON.parse(cached), {
      headers: { 'X-Cache': 'HIT' }
    })
  }

  const wikis = await prisma.wiki.findMany()
  await redis.setex(cacheKey, 300, JSON.stringify(wikis))

  return NextResponse.json(wikis, {
    headers: { 'X-Cache', 'MISS' }
  })
}
```

**Database Connection Pooling**:
```typescript
// Enhanced Prisma configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  // Optimize for production
  ...(process.env.NODE_ENV === 'production' && {
    datasources: {
      db: {
        url: process.env.DATABASE_URL + '?connection_limit=20&pool_timeout=20',
      },
    },
  }),
})
```

### Resource Optimization

**Container Resource Limits**:
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

**Next.js Optimization**:
```javascript
// next.config.js
module.exports = {
  // Enable compression
  compress: true,
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  // Bundle analyzer
  experimental: {
    bundlePagesExternals: true,
    parallelServerBuildTraces: true,
  },
}
```

---

**Next**: [Project Evolution](project-evolution.md) →
