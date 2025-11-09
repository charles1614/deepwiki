# API Design

[← Back to Index](index.md)

**Part of**: DeepWiki Architecture Documentation
**Generated**: 19 November 2025
**Source commit**: 2be6259

---

## API Architecture Overview

DeepWiki implements a **RESTful API architecture** with 19 endpoints organized into logical groups. The API provides comprehensive functionality for authentication, wiki management, search, analytics, and dashboard operations. All endpoints use **Next.js API Routes** with TypeScript for type safety and consistent error handling.

### Design Principles

- **RESTful Design**: Standard HTTP methods (GET, POST, PUT, DELETE)
- **Type Safety**: TypeScript interfaces for all requests/responses
- **Consistent Error Handling**: Standardized error response format
- **Input Validation**: Zod schema validation for all inputs
- **Authentication**: JWT-based API authentication
- **Performance**: Optimized queries with proper indexing

---

## API Structure

### Endpoint Organization

```
/api/
├── auth/                    # Authentication endpoints
│   ├── register/           # User registration
│   ├── [...nextauth]/      # NextAuth.js handler
│   └── reset-password/     # Password reset flow
│       ├── request/        # Request password reset
│       └── confirm/        # Confirm password reset
├── wiki/                   # Wiki management
│   ├── upload/             # File upload
│   ├── search/             # Search endpoints
│   │   └── suggestions/    # Search suggestions
│   ├── list/               # List wikis
│   ├── bulk-delete/        # Bulk operations
│   ├── stats/              # Wiki statistics
│   ├── [slug]/             # Wiki-specific routes
│   │   ├── files/          # Wiki files
│   │   └── file/[fileName]/ # Specific file
│   └── file/[fileId]/      # File by ID
├── dashboard/              # Dashboard data
│   ├── activities/         # User activities
│   └── stats/              # Dashboard statistics
├── analytics/              # Analytics
│   └── quick-action/       # Quick actions
└── health/                 # Health check
```

### Request/Response Patterns

**Consistent Response Format**:
```typescript
// Success Response
{
  success: true,
  data?: any,
  message?: string,
  total?: number
}

// Error Response
{
  error: "Error message",
  code?: string
}
```

**Authentication**: All wiki operations require authentication via NextAuth.js session cookies.

---

## Authentication Endpoints

### 1. User Registration

**Endpoint**: `POST /api/auth/register`
**File**: `app/api/auth/register/route.ts:6-63`
**Authentication**: Not required
**Rate Limiting**: Not implemented

**Request**:
```typescript
{
  email: string,          // Valid email address
  password: string,       // 8+ chars, mixed case, number
  confirmPassword: string // Must match password
}
```

**Response** (201):
```typescript
{
  message: "User created successfully",
  user: {
    id: string,
    email: string,
    role: "USER"
  }
}
```

**Response** (400):
```typescript
{
  error: "Invalid input data"
}
```

**Response** (400):
```typescript
{
  error: "Email already exists"
}
```

**Response** (500):
```typescript
{
  error: "Internal server error"
}
```

### 2. NextAuth.js Handler

**Endpoint**: `POST /api/auth/[...nextauth]`
**File**: `app/api/auth/[...nextauth]/route.ts:1-30`
**Authentication**: Not required
**Purpose**: Login, logout, session management

**Login Request**:
```typescript
{
  email: string,
  password: string
}
```

**Login Response** (200):
```typescript
{
  user: {
    id: string,
    email: string,
    role: "USER" | "ADMIN"
  },
  expires: string
}
```

**Login Response** (401):
```typescript
{
  error: "Invalid credentials"
}
```

### 3. Password Reset Request

**Endpoint**: `POST /api/auth/reset-password/request`
**File**: `app/api/auth/reset-password/request/route.ts:1-50`
**Authentication**: Not required

**Request**:
```typescript
{
  email: string
}
```

**Response** (200):
```typescript
{
  message: "If an account with that email exists, a reset link has been sent."
}
```

### 4. Password Reset Confirmation

**Endpoint**: `POST /api/auth/reset-password/confirm`
**File**: `app/api/auth/reset-password/confirm/route.ts:1-60`
**Authentication**: Not required

**Request**:
```typescript
{
  token: string,           // Reset token
  newPassword: string,     // New password
  confirmPassword: string  // Password confirmation
}
```

**Response** (200):
```typescript
{
  message: "Password reset successfully"
}
```

**Response** (400):
```typescript
{
  error: "Invalid or expired reset token"
}
```

---

## Wiki Management Endpoints

### 5. Upload Wiki Files

**Endpoint**: `POST /api/wiki/upload`
**File**: `app/api/wiki/upload/route.ts:1-60`
**Authentication**: Required
**Content-Type**: `multipart/form-data`

**Request FormData**:
```typescript
{
  title: string,              // Wiki title
  description?: string,       // Wiki description
  files: File[],              // Array of markdown files
  folderName?: string         // Optional folder name
}
```

**Response** (200):
```typescript
{
  message: "Wiki uploaded successfully",
  wiki: {
    id: string,
    title: string,
    slug: string,
    description?: string,
    folderName: string,
    createdAt: string,
    updatedAt: string,
    files: Array<{
      id: string,
      fileName: string,
      filePath: string,
      fileSize: number,
      contentType: string
    }>
  }
}
```

**Response** (400):
```typescript
{
  error: "Invalid file type or missing required fields"
}
```

**Response** (500):
```typescript
{
  error: "File upload failed"
}
```

### 6. Search Wikis

**Endpoint**: `GET /api/wiki/search`
**File**: `app/api/wiki/search/route.ts:90-268`
**Authentication**: Required
**Query Parameters**: All optional

**Query Parameters**:
```typescript
{
  q: string,          // Search query (min 2 chars)
  content?: "true" | "false",  // Search in file content
  highlight?: "true" | "false", // Include snippets
  fromDate?: string,   // ISO date string
  toDate?: string,     // ISO date string
  fileType?: string,   // File type filter
  limit?: number       // Results limit (default: 20)
}
```

**Response** (200):
```typescript
{
  success: true,
  results: Array<{
    wiki: {
      id: string,
      title: string,
      slug: string,
      description: string | null,
      createdAt: string,
      updatedAt: string
    },
    matches: Array<{
      file: {
        id: string,
        fileName: string,
        filePath: string,
        contentType: string
      },
      content: string,
      snippet?: string
    }>
  }>,
  total: number
}
```

**Search Features**:
- **Boolean Queries**: Support for AND, OR, NOT operators
- **Exact Phrases**: Quoted string matching
- **Content Search**: Full-text search in file content
- **Date Filtering**: Filter by creation/update date
- **File Type Filtering**: Filter by content type
- **Snippet Generation**: Contextual snippets with highlighting

### 7. Search Suggestions

**Endpoint**: `GET /api/wiki/search/suggestions`
**File**: `app/api/wiki/search/suggestions/route.ts:1-40`
**Authentication**: Required

**Query Parameters**:
```typescript
{
  q: string,  // Search query (min 2 chars)
  limit?: number  // Suggestions limit (default: 10)
}
```

**Response** (200):
```typescript
{
  success: true,
  suggestions: Array<{
    text: string,
    type: "wiki" | "file" | "content",
    count: number
  }>
}
```

### 8. List Wikis

**Endpoint**: `GET /api/wiki/list`
**File**: `app/api/wiki/list/route.ts:1-50`
**Authentication**: Required

**Query Parameters**:
```typescript
{
  limit?: number,     // Results limit
  offset?: number,    // Pagination offset
  sortBy?: "title" | "createdAt" | "updatedAt",
  sortOrder?: "asc" | "desc"
}
```

**Response** (200):
```typescript
{
  success: true,
  wikis: Array<{
    id: string,
    title: string,
    slug: string,
    description: string | null,
    createdAt: string,
    updatedAt: string,
    fileCount: number,
    versionCount: number
  }>,
  total: number,
  hasMore: boolean
}
```

### 9. Get Wiki by Slug

**Endpoint**: `GET /api/wiki/[slug]`
**File**: `app/api/wiki/slug/[slug]/route.ts:1-50`
**Authentication**: Required
**Cache**: Public, max-age=300

**Response** (200):
```typescript
{
  id: string,
  title: string,
  slug: string,
  description: string | null,
  folderName: string,
  createdAt: string,
  updatedAt: string,
  files: Array<{
    id: string,
    fileName: string,
    filePath: string,
    fileSize: number,
    contentType: string
  }>
}
```

**Response** (404):
```typescript
{
  error: "Wiki not found"
}
```

### 10. Get Wiki Files

**Endpoint**: `GET /api/wiki/[slug]/files`
**File**: `app/api/wiki/[slug]/files/route.ts:1-40`
**Authentication**: Required

**Response** (200):
```typescript
{
  success: true,
  files: Array<{
    id: string,
    fileName: string,
    filePath: string,
    fileSize: number,
    contentType: string,
    createdAt: string
  }>
}
```

### 11. Get File Content

**Endpoint**: `GET /api/wiki/[slug]/file/[fileName]`
**File**: `app/api/wiki/[slug]/file/[fileName]/route.ts:1-40`
**Authentication**: Required
**Cache**: Public, max-age=1800

**Response** (200):
```typescript
{
  success: true,
  file: {
    id: string,
    fileName: string,
    filePath: string,
    fileSize: number,
    contentType: string,
    content: string,
    createdAt: string
  }
}
```

**Response** (404):
```typescript
{
  error: "File not found"
}
```

### 12. Get File by ID

**Endpoint**: `GET /api/wiki/file/[fileId]`
**File**: `app/api/wiki/file/[fileId]/route.ts:1-50`
**Authentication**: Required

**Response** (200):
```typescript
{
  success: true,
  file: {
    id: string,
    fileName: string,
    filePath: string,
    fileSize: number,
    contentType: string,
    content?: string,
    createdAt: string
  }
}
```

### 13. Update Wiki

**Endpoint**: `PUT /api/wiki/[slug]`
**File**: `app/api/wiki/[slug]/route.ts:50-80`
**Authentication**: Required

**Request**:
```typescript
{
  title?: string,        // Wiki title
  description?: string,  // Wiki description
  changeLog?: string     // Change description
}
```

**Response** (200):
```typescript
{
  message: "Wiki updated successfully",
  wiki: {
    // Updated wiki object
  }
}
```

### 14. Delete Wiki

**Endpoint**: `DELETE /api/wiki/[slug]`
**File**: `app/api/wiki/[slug]/route.ts:80-110`
**Authentication**: Required (ADMIN or owner)

**Response** (200):
```typescript
{
  message: "Wiki deleted successfully"
}
```

**Response** (403):
```typescript
{
  error: "Access denied"
}
```

### 15. Bulk Delete Wikis

**Endpoint**: `POST /api/wiki/bulk-delete`
**File**: `app/api/wiki/bulk-delete/route.ts:1-50`
**Authentication**: Required (ADMIN)

**Request**:
```typescript
{
  wikiIds: string[]  // Array of wiki IDs to delete
}
```

**Response** (200):
```typescript
{
  message: "Wikis deleted successfully",
  deletedCount: number,
  failedCount: number,
  errors?: Array<{
    wikiId: string,
    error: string
  }>
}
```

### 16. Get Wiki Statistics

**Endpoint**: `GET /api/wiki/stats`
**File**: `app/api/wiki/stats/route.ts:1-40`
**Authentication**: Required

**Response** (200):
```typescript
{
  success: true,
  stats: {
    totalWikis: number,
    totalFiles: number,
    totalSize: number,
    averageFilesPerWiki: number,
    topWikis: Array<{
      id: string,
      title: string,
      fileCount: number
    }>,
    recentActivity: Array<{
      id: string,
      action: string,
      timestamp: string
    }>
  }
}
```

---

## Dashboard Endpoints

### 17. Dashboard Statistics

**Endpoint**: `GET /api/dashboard/stats`
**File**: `app/api/dashboard/stats/route.ts:1-30`
**Authentication**: Required

**Response** (200):
```typescript
{
  success: true,
  stats: {
    totalWikis: number,
    totalUsers: number,
    totalFiles: number,
    recentUploads: number,
    activeUsers: number,
    storageUsed: number
  }
}
```

### 18. User Activities

**Endpoint**: `GET /api/dashboard/activities`
**File**: `app/api/dashboard/activities/route.ts:1-40`
**Authentication**: Required

**Query Parameters**:
```typescript
{
  limit?: number,  // Activity limit
  offset?: number  // Pagination
}
```

**Response** (200):
```typescript
{
  success: true,
  activities: Array<{
    id: string,
    userId: string,
    userEmail: string,
    action: string,
    targetType: "wiki" | "user" | "file",
    targetId: string,
    timestamp: string,
    metadata?: any
  }>,
  total: number
}
```

---

## Analytics Endpoints

### 19. Quick Actions

**Endpoint**: `POST /api/analytics/quick-action`
**File**: `app/api/analytics/quick-action/route.ts:1-30`
**Authentication**: Required (ADMIN)

**Request**:
```typescript
{
  action: "cleanup_orphaned_files" | "reindex_search" | "generate_sitemap",
  parameters?: any
}
```

**Response** (200):
```typescript
{
  success: true,
  message: "Action completed successfully",
  result?: any
}
```

---

## Health Check Endpoint

### 20. System Health

**Endpoint**: `GET /api/health`
**File**: `app/api/health/route.ts:1-20`
**Authentication**: Not required

**Response** (200):
```typescript
{
  status: "healthy",
  timestamp: string,
  uptime: number,
  database: "connected" | "disconnected",
  version: string
}
```

---

## Search Implementation Details

### Boolean Query Parsing

**File**: `app/api/wiki/search/route.ts:25-55`

The search system supports sophisticated boolean queries:

```typescript
function parseBooleanQuery(query: string): {
  includeTerms: string[]
  excludeTerms: string[]
  exactPhrases: string[]
} {
  const includeTerms: string[] = []
  const excludeTerms: string[] = []
  const exactPhrases: string[] = []

  // Extract quoted phrases
  const phraseRegex = /"([^"]+)"/g
  let match
  while ((match = phraseRegex.exec(query)) !== null) {
    exactPhrases.push(match[1])
  }

  // Process boolean operators
  // AND, OR, NOT support
  // Example: "docker AND kubernetes NOT tutorial"
  // Example: "authentication" OR "auth"
  // Example: "configuration" NOT "legacy"
}
```

**Search Features**:
- **Boolean Operators**: AND, OR, NOT
- **Exact Phrases**: Quoted strings
- **Wildcards**: Term matching
- **Case Insensitive**: All searches are case-insensitive

### Snippet Generation

**File**: `app/api/wiki/search/route.ts:69-88`

```typescript
function createSnippet(content: string, query: string, maxLength: number = 300): string {
  const queryLower = query.toLowerCase()
  const contentLower = content.toLowerCase()
  const index = contentLower.indexOf(queryLower)

  if (index === -1) {
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '')
  }

  // Extract context around the match
  const start = Math.max(0, index - 50)
  const end = Math.min(content.length, index + query.length + 150)

  let snippet = content.substring(start, end)
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'

  // Highlight the query term
  const regex = new RegExp(`(${query})`, 'gi')
  snippet = snippet.replace(regex, '<mark>$1</mark>')

  return snippet
}
```

---

## Error Handling

### Error Response Format

All API endpoints use consistent error responses:

```typescript
{
  error: string,      // Human-readable error message
  code?: string,      // Machine-readable error code
  details?: any       // Additional error context
}
```

### Error Status Codes

| Status Code | Meaning | Usage |
|-------------|---------|-------|
| 400 | Bad Request | Invalid input data, validation errors |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limiting (not implemented) |
| 500 | Internal Server Error | Unhandled server errors |

### Error Examples

**Validation Error** (400):
```typescript
{
  error: "Invalid input data",
  details: {
    email: ["Invalid email address"],
    password: ["Password must contain uppercase, lowercase, and number"]
  }
}
```

**Authentication Error** (401):
```typescript
{
  error: "Authentication required"
}
```

**Authorization Error** (403):
```typescript
{
  error: "Access denied. Admin privileges required."
}
```

**Not Found Error** (404):
```typescript
{
  error: "Wiki not found"
}
```

**Server Error** (500):
```typescript
{
  error: "Internal server error"
}
```

---

## Request/Response Examples

### Complete File Upload Example

**Request**:
```bash
POST /api/wiki/upload
Content-Type: multipart/form-data

title: "Docker Documentation"
description: "Complete guide to Docker containerization"
files: [docker-basics.md, docker-advanced.md, docker-compose.yml]
folderName: "docker-guide"
```

**Response**:
```json
{
  "message": "Wiki uploaded successfully",
  "wiki": {
    "id": "clp2k3m4f00001234567890ab",
    "title": "Docker Documentation",
    "slug": "docker-documentation",
    "description": "Complete guide to Docker containerization",
    "folderName": "docker-guide",
    "createdAt": "2025-11-19T10:30:00.000Z",
    "updatedAt": "2025-11-19T10:30:00.000Z",
    "files": [
      {
        "id": "clp2k3m4f00001234567890cd",
        "fileName": "docker-basics.md",
        "filePath": "docker-guide/docker-basics.md",
        "fileSize": 15420,
        "contentType": "text/markdown"
      }
    ]
  }
}
```

### Advanced Search Example

**Request**:
```bash
GET /api/wiki/search?q=docker AND kubernetes NOT tutorial&content=true&highlight=true&limit=10
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "wiki": {
        "id": "clp2k3m4f00001234567890ab",
        "title": "Container Orchestration Guide",
        "slug": "container-orchestration-guide",
        "description": "Complete guide to container orchestration",
        "createdAt": "2025-11-19T10:30:00.000Z",
        "updatedAt": "2025-11-19T10:35:00.000Z"
      },
      "matches": [
        {
          "file": {
            "id": "clp2k3m4f00001234567890cd",
            "fileName": "orchestration-setup.md",
            "filePath": "orchestration/orchestration-setup.md",
            "contentType": "text/markdown"
          },
          "content": "Docker containers can be orchestrated using Kubernetes...",
          "snippet": "...Docker containers can be orchestrated using <mark>Kubernetes</mark> for production deployments..."
        }
      ]
    }
  ],
  "total": 1
}
```

---

## API Testing

### Test Coverage

**Unit Tests**: `__tests__/models/wiki.test.ts`
- API route handlers
- Input validation
- Error handling
- Response formatting

**E2E Tests**: `tests/e2e/wiki.spec.ts`
- Complete user workflows
- Multi-step operations
- Authentication flows
- Error scenarios

### Test Examples

**E2E Test - Wiki Upload** (`tests/e2e/wiki-upload.spec.ts:1-50`):
```typescript
import { test, expect } from '@playwright/test'

test.describe('Wiki Upload', () => {
  test('user can upload wiki files', async ({ page }) => {
    await page.goto('/upload')
    await page.fill('[name="title"]', 'Test Wiki')
    await page.fill('[name="description"]', 'Test Description')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([
      'test-files/test-wiki.md',
      'test-files/another-file.md'
    ])

    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/^\/wiki\/.*$/)
    await expect(page.locator('h1')).toContainText('Test Wiki')
  })
})
```

**E2E Test - Search** (`tests/e2e/wiki-search.spec.ts:1-40`):
```typescript
test('user can search wikis', async ({ page }) => {
  await page.goto('/search')
  await page.fill('[name="q"]', 'docker')
  await page.click('button[type="submit"]')

  await expect(page.locator('.search-results')).toBeVisible()
  await expect(page.locator('.search-result')).toHaveCount(5)
})
```

---

## Performance Optimizations

### Database Optimizations

- **Indexed Queries**: All search and lookup fields are indexed
- **Connection Pooling**: Prisma connection management
- **Query Optimization**: Efficient JOINs and WHERE clauses
- **Pagination**: All list endpoints support pagination

**File**: `prisma/schema.prisma:44-82`

```prisma
// Indexed fields for performance
model WikiFile {
  // ... fields
  @@index([wikiId])
  @@index([contentType])
}

model WikiVersion {
  // ... fields
  @@index([wikiId])
  @@index([userId])
}
```

### Caching Strategy

- **HTTP Caching**: Cache-Control headers for static content
- **Database Caching**: Prisma query optimization
- **CDN Integration**: Static asset delivery

**Example**: `app/api/wiki/slug/[slug]/route.ts:30-40`
```typescript
return NextResponse.json(wiki, {
  headers: {
    'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600'
  }
})
```

### Response Optimization

- **Field Selection**: Select only required fields
- **Pagination**: Limit result sets
- **Compression**: Gzip compression
- **JSON Streaming**: For large responses

---

## Security Considerations

### Authentication Requirements

- **Session-based Auth**: All operations except auth endpoints require login
- **Role-based Access**: Admin-only endpoints for sensitive operations
- **CSRF Protection**: NextAuth.js built-in CSRF protection
- **XSS Prevention**: Input sanitization and output encoding

### Input Validation

- **Schema Validation**: Zod schemas for all inputs
- **File Type Validation**: Whitelist of allowed file types
- **Size Limits**: Maximum file size enforcement
- **SQL Injection Prevention**: Prisma ORM parameterization

### Rate Limiting

Currently **not implemented** but recommended for production:
- Request rate limiting per IP
- Authentication attempt limiting
- Search request throttling

---

## API Versioning

**Current Version**: v1 (implied)
**Versioning Strategy**: URL path versioning (planned)

**Future Endpoint Format**:
```
/api/v2/wiki/search
/api/v2/auth/register
```

**Backward Compatibility**:
- Current v1 endpoints will be maintained
- New versions will be additive
- Breaking changes require new major version

---

## Documentation Standards

### OpenAPI/Swagger

**Status**: Not currently implemented
**Recommendation**: Add OpenAPI 3.0 specification for:
- Interactive API documentation
- Client SDK generation
- Automated testing
- API contract validation

**Example OpenAPI Structure**:
```yaml
openapi: 3.0.0
info:
  title: DeepWiki API
  version: 1.0.0
paths:
  /api/wiki/search:
    get:
      summary: Search wikis
      parameters:
        - name: q
          in: query
          required: true
          schema:
            type: string
      responses:
        200:
          description: Search results
```

---

**Next**: [Database Layer](database-layer.md) →
