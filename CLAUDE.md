# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DeepWiki is a Next.js 16 wiki management system with an integrated SSH terminal and AI workspace. It features wiki hosting with markdown support, Mermaid diagrams, cloud storage (R2), and remote server access via SSH with persistent session management.

**Core Tech Stack:**
- Next.js 16 with App Router
- Custom Node.js server with Socket.IO (server.js)
- PostgreSQL with Prisma ORM
- NextAuth.js v5 for authentication
- Cloudflare R2 for wiki file storage
- SSH2 for remote connections
- xterm.js for terminal emulation
- Mermaid for diagram rendering

## Development Commands

### Core Development
```bash
npm run dev              # Start custom server with Socket.IO (NOT next dev)
npm run build            # Build for production
npm run start            # Start production server (custom server)
```

**IMPORTANT**: This project uses a custom Node.js server ([server.js](server.js)) instead of the default Next.js dev server. The server integrates Socket.IO for SSH connections and session management.

### Database
```bash
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database (admin@deepwiki.com/Admin123!, user@deepwiki.com/User123!)
```

### Code Quality
```bash
npm run lint             # ESLint
npm run type-check       # TypeScript type checking
npm run format           # Prettier formatting
npm run format:check     # Check formatting
```

### Testing
```bash
npm run test             # Unit tests (Jest)
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report (70% threshold)
npm run test:e2e         # E2E tests (Playwright, runs dev server automatically)
```

**E2E Testing Notes:**
- Playwright automatically starts dev server via dotenv
- Uses 4 parallel workers (reduced from 8 for stability)
- Tests run across Chromium, Firefox, and WebKit
- Custom fixtures in [tests/e2e/helpers/fixtures.ts](tests/e2e/helpers/fixtures.ts)
- R2 storage credentials configured in playwright.config.ts

## Architecture

### Custom Server Architecture

The application uses a **custom Node.js server** ([server.js](server.js)) rather than the default Next.js server:

**Key Features:**
- Socket.IO integration at `/api/socket` path
- SSH connection management with session preservation
- SFTP client for file browsing
- Session manager for persistent connections across page navigation
- 24-hour session timeout with cleanup intervals

**SSH Session Flow:**
1. Client emits `ssh-connect` with credentials or `connectionId`
2. Server creates SSH client and SFTP client
3. Session preserved with unique `sessionId`
4. Terminal state and file browser state saved on navigation
5. Session can be restored after page navigation via `navigation-restore` event
6. Sessions auto-cleanup after 24 hours of inactivity

**Important Socket.IO Events:**
- `ssh-connect` - Establish SSH connection
- `ssh-data` - Send/receive terminal data
- `ssh-resize` - Terminal resize events
- `navigation-pause/resume/disconnect/restore` - Session preservation
- `sftp-list/read` - File browser operations
- `ssh-get-pwd` - Get current working directory
- `ssh-poll-pwd-file` - Poll `.deepwiki_pwd` file for zellij support

### Database Schema

**Core Models:**
- `User` - Authentication with role-based access (USER/ADMIN)
- `Wiki` - Wiki metadata with `isPublic` flag and owner relationship
- `WikiFile` - Individual markdown files stored in R2
- `WikiVersion` - File version history with checksums
- `SystemSetting` - Key-value configuration store
- `SshConnection` - Encrypted SSH credentials and proxy settings

**Important Relationships:**
- All models use cascade deletes (`onDelete: Cascade`)
- Files versioned per-file, not per-wiki
- Users own wikis, wikis own files, files have versions

### Storage Architecture

**R2 Cloud Storage** ([lib/storage/r2.ts](lib/storage/r2.ts)):
- All wiki files stored in Cloudflare R2
- File operations: upload, download, delete, bulk delete
- Files organized by wiki slug and filename
- Database tracks URLs, R2 stores actual content

**Encryption** ([lib/encryption.ts](lib/encryption.ts)):
- AES-256-GCM encryption for sensitive data
- SSH credentials encrypted at rest
- Requires `ENCRYPTION_KEY` environment variable
- Server.js includes decryption logic for SSH connections

### AI Terminal Feature

Located in [app/ai/page.tsx](app/ai/page.tsx), this feature provides:
- SSH terminal with xterm.js
- File browser with SFTP integration
- Claude Code environment setup assistance
- Session preservation across page navigation
- Two connection modes: Web (direct SSH) and Proxy (via standalone SSH proxy)
- File-based PWD polling for zellij/tmux support

**Directory Sync Pattern:**
The terminal writes current directory to `.deepwiki_pwd` file, polled by frontend every 2 seconds. This enables directory synchronization in terminal multiplexers like zellij where traditional shell integration fails.

## Key Application Areas

### Authentication ([lib/auth.ts](lib/auth.ts))
- NextAuth.js v5 with credentials provider
- JWT sessions with user verification on each session load
- Role-based access (USER/ADMIN)
- Session invalidation if user deleted from database
- Docker-friendly with `trustHost: true`

### Wiki Management
- Upload markdown files with bulk operations
- Automatic slug generation from titles
- Public/private wiki visibility
- Complete cascade deletion (DB + R2 storage)
- Search with full-text search across content
- Mermaid diagram rendering with zoom/pan controls

### Admin Panel ([app/admin/](app/admin/))
- User management with bulk operations
- System settings configuration
- Activity tracking

## Environment Variables

**Required:**
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/deepwiki"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# R2 Storage
CLOUDFLARE_R2_BUCKET_NAME=your-bucket
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret
CLOUDFLARE_R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com

# Encryption
ENCRYPTION_KEY="your-encryption-key"  # For SSH credential encryption
```

**Optional:**
```bash
# SSH Proxy (for AI feature)
ANTHROPIC_BASE_URL="https://api.anthropic.com"  # Override API endpoint

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
PORT=3000
```

## Important Patterns

### Server-Side Data Fetching
Use Server Actions ([app/actions/](app/actions/)) or API routes for data mutations:
- Server Actions: Direct database access with `'use server'`
- API routes: RESTful endpoints with NextResponse

### Prisma Retry Logic ([lib/prisma-retry.ts](lib/prisma-retry.ts))
Wrap Prisma operations with retry logic for transient failures:
```typescript
import { withPrismaRetry } from '@/lib/prisma-retry'
const result = await withPrismaRetry(() => prisma.wiki.findMany())
```

### Markdown Processing
- Marked.js for parsing
- DOMPurify for sanitization
- Mermaid diagrams with auto-initialization and zoom controls
- Syntax highlighting with Prism.js
- Wiki link navigation with `[[link]]` syntax

### Component Organization
```
components/
├── auth/          # Login, register, password reset forms
├── layout/        # Protected routes, providers, navigation
├── ui/            # Reusable UI primitives (Button, Input, Alert)
├── wiki/          # Wiki-specific components (file browser, viewer)
└── ai/            # SSH terminal and file browser components
```

## Testing Conventions

### Unit Tests ([__tests__/](\_\_tests__/))
- React Testing Library for component tests
- Mock Next.js API routes with custom helpers
- Factory functions for test data
- Coverage threshold: 70% (branches, functions, lines, statements)

### E2E Tests ([tests/e2e/](tests/e2e/))
- Custom fixtures for authentication and wiki setup
- Test utilities for common operations
- Global setup for polyfills ([tests/e2e/setup.ts](tests/e2e/setup.ts))
- Isolated database for each test where needed

## Deployment

### Docker
Development: `docker-compose up -d`
Production: `docker-compose -f docker-compose.prod.yml up -d --build`

**Important**: Database migrations run automatically in Docker setup (idempotent).

### Manual Deployment
```bash
npm run build
npm run start
```

### Production Considerations
- Set `NODE_ENV=production`
- Configure secure `NEXTAUTH_SECRET`
- Use production PostgreSQL database
- Configure R2 bucket with proper CORS
- Set up Nginx reverse proxy for HTTPS (see README)
- Ensure `ENCRYPTION_KEY` is consistent across deployments

## Common Issues

### Custom Server Conflicts
If you see Socket.IO connection errors, ensure:
- Running `npm run dev`, NOT `next dev`
- Port 3000 is available
- No other Next.js dev servers running

### SSH Connection Issues
- Check `ENCRYPTION_KEY` matches between deployments
- Verify SSH credentials in database are properly encrypted
- Check proxy URL configuration for proxy mode
- Review server.js logs for detailed SSH errors

### R2 Storage Issues
- Verify R2 credentials and bucket permissions
- Check CORS configuration on R2 bucket
- Ensure endpoint URL matches account ID

### Database Connection Pool
Prisma connection pool optimized for parallel E2E tests. If encountering connection issues during tests, check `DATABASE_URL` connection limit.
