# DeepWiki - Claude Development Guide

## Project Overview

DeepWiki is a Next.js 15 application with a complete authentication system, built with Claude Code scaffolding. It demonstrates modern web development patterns with TypeScript, Tailwind CSS, Prisma ORM, and comprehensive testing.

**Tech Stack:**
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS for styling
- Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- NextAuth.js v5 for authentication
- React Hook Form + Zod for form validation
- Jest & React Testing Library for unit tests
- Playwright for E2E tests

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

### Code Quality
```bash
# Run ESLint
npm run lint

# Type checking
npm run type-check

# Format code with Prettier
npm run format
npm run format:check
```

### Database Operations
```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database with test users
npm run db:seed
```

### Testing
```bash
# Run unit/integration tests
npm run test
npm run test:watch
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Architecture Overview

### Directory Structure
```
deepwiki/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication route group
│   │   ├── login/               # Login page
│   │   ├── register/            # Registration page
│   │   └── reset-password/      # Password reset flow
│   ├── api/                     # API routes
│   │   └── auth/                # Authentication endpoints
│   ├── dashboard/               # Protected dashboard
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── components/                  # Reusable components
│   ├── auth/                    # Authentication components
│   ├── layout/                  # Layout components
│   └── ui/                      # UI primitives
├── lib/                         # Utilities and configuration
│   ├── auth.ts                  # NextAuth configuration
│   ├── database.ts              # Prisma client
│   └── validations.ts           # Zod schemas
├── prisma/                      # Database setup
│   ├── schema.prisma            # Database schema
│   └── seed.ts                  # Database seeding
├── tests/                       # Test files
│   └── e2e/                     # E2E tests
└── __tests__/                   # Unit tests
```

## Authentication System

### NextAuth.js Configuration
- **Provider**: Credentials (email/password)
- **Strategy**: JWT sessions
- **Database**: Prisma User model
- **Role-based access**: USER/ADMIN roles

### Authentication Flow
1. User registers via `/api/auth/register`
2. Credentials validated against Zod schema
3. Password hashed with bcryptjs
4. User stored in database with USER role
5. Login handled by NextAuth credentials provider
6. JWT tokens contain user role for authorization

### Protected Routes
- Use `ProtectedRoute` component for route protection
- Set `requireAdmin={true}` for admin-only routes
- Automatically redirects unauthenticated users to `/login`

### Session Management
```tsx
// Access session data
import { useSession } from 'next-auth/react'

const { data: session } = useSession()
// session.user.email, session.user.role, session.user.id
```

## Database Schema

### User Model
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}
```

### Database Configuration
- **Development**: SQLite (`file:./dev.db`)
- **Production**: PostgreSQL (configure via DATABASE_URL)
- **Seeded users**:
  - Admin: `admin@deepwiki.com` / `Admin123!`
  - User: `user@deepwiki.com` / `User123!`

## Component Architecture

### UI Components (`components/ui/`)
- **Button**: Loading states, test IDs
- **Input**: Form integration, error handling
- **Alert**: Success/error messages

### Authentication Components (`components/auth/`)
- **LoginForm**: React Hook Form + Zod validation
- **RegisterForm**: Password confirmation, strength validation
- **PasswordResetForm**: Email-based reset flow

### Layout Components (`components/layout/`)
- **ProtectedRoute**: Route protection with role support
- **Providers**: NextAuth session provider

## Form Validation

### Zod Schemas (`lib/validations.ts`)
```typescript
// Registration validation
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})
```

### Form Integration
- React Hook Form for form state
- Zod resolver for validation
- Automatic error display
- Loading states during submission

## API Routes

### Authentication Endpoints
```
POST /api/auth/register           # User registration
POST /api/auth/[...nextauth]      # NextAuth.js handler
POST /api/auth/reset-password/request  # Request password reset
POST /api/auth/reset-password/confirm  # Confirm password reset
```

### API Response Pattern
```typescript
// Success response
return NextResponse.json({
  message: 'Success message',
  data: result
}, { status: 200 })

// Error response
return NextResponse.json({
  error: 'Error message'
}, { status: 400 })
```

## Testing Setup

### Unit Tests (Jest + React Testing Library)
- **Location**: `__tests__/`
- **Configuration**: `jest.config.js`, `jest.setup.js`
- **Coverage**: `npm run test:coverage`
- **Mocking**: Next.js API routes, Request/Response objects

### E2E Tests (Playwright)
- **Location**: `tests/e2e/`
- **Configuration**: `playwright.config.ts`
- **Features covered**:
  - Registration flow
  - Login/logout
  - Protected route access
  - Form validation
  - Admin access
  - Keyboard navigation
  - Accessibility

### Running Tests
```bash
# Unit tests
npm run test                    # Single run
npm run test:watch             # Watch mode
npm run test:coverage          # With coverage

# E2E tests
npm run test:e2e               # All browsers
npx playwright test --project=chromium  # Specific browser
npx playwright test --debug    # Debug mode
```

## Environment Configuration

### Required Environment Variables (`.env.local`)
```bash
# Database
DATABASE_URL="file:./dev.db"    # SQLite for development
# DATABASE_URL="postgresql://..."  # PostgreSQL for production

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Email (for password reset)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="noreply@deepwiki.com"

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Development Patterns

### File Naming
- Components: `PascalCase.tsx`
- Pages: `page.tsx` (App Router convention)
- API routes: `route.ts`
- Utilities: `camelCase.ts`

### Import Aliases
```typescript
// Configured in tsconfig.json
import { Component } from '@/components/ui/Component'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
```

### Error Handling
- Form validation: Zod schemas with user-friendly messages
- API errors: Consistent JSON error responses
- Database errors: Try-catch with proper logging

### Accessibility
- Semantic HTML elements
- ARIA labels and attributes
- Keyboard navigation support
- Screen reader testing via E2E tests

## Deployment Considerations

### Database Migration
1. Set `DATABASE_URL` to PostgreSQL
2. Run `npm run db:migrate`
3. Run `npm run db:seed` for initial data

### Environment Setup
1. Configure production environment variables
2. Set `NEXTAUTH_URL` to production domain
3. Configure email provider for password resets
4. Ensure `NEXTAUTH_SECRET` is secure and random

### Security Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- (Configured in `next.config.js`)

## Common Development Tasks

### Adding New API Route
```typescript
// app/api/endpoint/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  // Handle GET request
  return NextResponse.json({ data: result })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  // Handle POST request
  return NextResponse.json({ message: 'Success' })
}
```

### Adding New Protected Page
```tsx
// app/new-page/page.tsx
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

export default function NewPage() {
  return (
    <ProtectedRoute>
      {/* Page content */}
    </ProtectedRoute>
  )
}
```

### Database Schema Changes
1. Modify `prisma/schema.prisma`
2. Run `npm run db:generate`
3. Run `npm run db:migrate`
4. Update seed file if needed

### Adding Form Validation
1. Create Zod schema in `lib/validations.ts`
2. Use with React Hook Form:
```tsx
const form = useForm({
  resolver: zodResolver(yourSchema),
  defaultValues: initialData
})
```

## Testing Best Practices

### Unit Tests
- Test component behavior, not implementation
- Use meaningful test IDs for selection
- Mock external dependencies
- Test error states and edge cases

### E2E Tests
- Test user workflows end-to-end
- Use data-testid attributes for reliable selectors
- Test across different viewports
- Include accessibility testing

This guide provides a comprehensive foundation for understanding and extending the DeepWiki codebase. The project demonstrates modern full-stack development patterns with a focus on security, testing, and developer experience.