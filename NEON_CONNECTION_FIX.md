# Neon Connection Configuration Fix

## Problem
Your Neon database (0.25 compute) has:
- **max_connections: 112** (7 reserved = 105 available)
- Default connection pool timeout: 120s
- You're likely using a direct connection instead of pooled

## Solution

### 1. Update `.env.local` to use pooled connection string

Replace your DATABASE_URL with the **pooled** version:

```bash
# Before (direct connection - BAD for E2E tests):
# DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname"

# After (pooled connection with limits - GOOD):
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require&connection_limit=5&pool_timeout=10&connect_timeout=30"
```

**Key changes:**
- Add `-pooler` to endpoint ID
- `connection_limit=5` - Limit each Prisma instance to 5 connections
- `pool_timeout=10` - Wait max 10s for connection from pool
- `connect_timeout=30` - Connection establishment timeout

### 2. Why This Fixes Your Tests

**Current problem:**
- E2E tests run in parallel (3 browsers × 11 tests = 33 concurrent)
- Each test creates Prisma connections
- Without pooling, you hit the 112 connection limit
- Connections stay open for 120s default timeout
- New connections get "Error { kind: Closed }" when pool is exhausted

**With pooling:**
- PgBouncer manages connections in transaction mode
- Connections are returned to pool immediately after queries
- Up to 10,000 client connections can share the pool
- Much better for parallel test execution

### 3. Additional Prisma Configuration

Update `lib/database.ts` to handle closed connections:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Prisma will automatically handle connection retries with pooled connections
```

### 4. Get Your Pooled Connection String

1. Go to your Neon dashboard
2. Click "Connect" on your database
3. **Toggle "Connection pooling" ON**
4. Copy the connection string (it will have `-pooler` in it)
5. Add the query parameters: `?connection_limit=5&pool_timeout=10&connect_timeout=30`

## Expected Results

After updating:
- ✅ No more "Connection Closed" errors
- ✅ E2E tests can run in parallel without exhausting connections
- ✅ Better performance due to connection reuse
- ✅ Works within Neon's 112 connection limit

## References

- [Neon Connection Pooling Docs](https://neon.tech/docs/connect/connection-pooling)
- [Prisma Issue #6329](https://github.com/prisma/prisma/issues/6329)
