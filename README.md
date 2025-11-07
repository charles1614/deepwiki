# DeepWiki

🚀 **A comprehensive wiki management system built with Next.js 15** - Upload, manage, and browse markdown documentation with interactive diagrams, Mermaid support, and R2 cloud storage integration.

## ✨ Key Features

- 📚 **Complete Wiki Management** - Upload, organize, and delete markdown wikis with bulk operations
- 🎨 **Rich Content Support** - Mermaid diagrams, syntax highlighting, tables, and enhanced markdown rendering
- ☁️ **Cloud Storage** - R2 storage integration for scalable file hosting
- 🔐 **Authentication System** - NextAuth.js with role-based access (USER/ADMIN)
- 📊 **Analytics Dashboard** - Activity tracking, statistics, and management interface
- 🔍 **Advanced Search** - Full-text search across wiki content
- 📱 **Responsive Design** - Mobile-friendly interface with Tailwind CSS
- 🧪 **Comprehensive Testing** - Unit tests with Jest, E2E tests with Playwright
- ⚡ **Performance Optimized** - Next.js 15 App Router, TypeScript, and modern development practices

## 🚀 Quick Start (Fresh Setup)

### Prerequisites

- **Node.js 18+** and **npm** installed
- **Git** for version control
- **R2 Storage** account (for cloud file storage - optional for local development)

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd deepwiki

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

**Required `.env.local` configuration:**

```env
# Database (SQLite for development)
DATABASE_URL="file:./dev.db"

# NextAuth.js Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"

# Email Configuration (optional - for password reset)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="noreply@deepwiki.com"

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV="development"

# R2 Storage (optional - for cloud file storage)
# AWS_ACCESS_KEY_ID="your-r2-access-key"
# AWS_SECRET_ACCESS_KEY="your-r2-secret-key"
# AWS_REGION="auto"
# R2_BUCKET_NAME="your-bucket-name"
# R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed with test users (optional but recommended)
npm run db:seed
```

**Seeded Test Accounts:**
- **Admin:** `admin@deepwiki.com` / `Admin123!`
- **User:** `user@deepwiki.com` / `User123!`

### 4. Start Development

```bash
# Start the development server
npm run dev
```

**🎉 Open [http://localhost:3000](http://localhost:3000) in your browser**

## 📋 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript type checking
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Prisma Studio (database GUI)
npm run db:seed          # Seed database with test data

# Testing
npm run test             # Run unit/integration tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:e2e         # Run E2E tests with Playwright

# Playwright (E2E Testing)
npx playwright install   # Install Playwright browsers
npx playwright test      # Run all E2E tests
npx playwright test --project=chromium --headed  # Run tests in headed mode
```

## 🏗️ Project Architecture

```
deepwiki/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   │   ├── login/               # Login page
│   │   ├── register/            # Registration page
│   │   └── reset-password/      # Password reset flow
│   ├── api/                     # API routes
│   │   ├── auth/                # Authentication endpoints
│   │   ├── dashboard/           # Dashboard statistics & activity
│   │   ├── wiki/                # Wiki management APIs
│   │   │   ├── bulk-delete/     # Bulk wiki deletion
│   │   │   ├── file/            # File serving
│   │   │   ├── search/          # Wiki search
│   │   │   └── slug/            # Individual wiki data
│   │   └── analytics/           # Analytics tracking
│   ├── dashboard/               # Protected dashboard
│   ├── upload/                  # Wiki upload page
│   ├── wiki/                    # Main wiki page
│   └── [slug]/                  # Individual wiki pages
├── components/                  # React components
│   ├── auth/                    # Authentication components
│   ├── layout/                  # Layout components
│   └── ui/                      # UI primitives
├── lib/                         # Utilities & configurations
│   ├── auth.ts                  # NextAuth configuration
│   ├── database.ts              # Prisma client
│   ├── storage/                 # R2 storage service
│   └── markdown/                # Markdown rendering
├── prisma/                      # Database setup
│   ├── schema.prisma            # Database schema
│   ├── migrations/              # Database migrations
│   └── seed.ts                  # Database seeding
├── __tests__/                   # Unit tests
├── tests/e2e/                   # E2E tests
└── public/                      # Static assets
```

## 🔧 Core Features

### 📚 Wiki Management
- **Upload wikis** with multiple markdown files
- **Bulk operations** - select and delete multiple wikis
- **File organization** - automatic file structure detection
- **R2 storage cleanup** - complete cloud storage cleanup on deletion

### 🎨 Rich Content
- **Mermaid diagrams** with zoom and pan functionality
- **Syntax highlighting** for code blocks
- **Responsive tables** with horizontal scrolling
- **Enhanced markdown** with tables, lists, and formatting

### 📊 Dashboard
- **Statistics** - total wikis, uploads, documents
- **Activity feed** - recent wiki operations
- **Quick actions** - easy navigation to key features
- **Management interface** - bulk operations with confirmation modals

### 🔐 Authentication
- **NextAuth.js v5** integration
- **Role-based access** - USER/ADMIN roles
- **Password reset** via email
- **Protected routes** with automatic redirects

### 🔍 Search & Discovery
- **Full-text search** across wiki content
- **Real-time suggestions** as you type
- **Advanced filtering** by content type
- **Search analytics** tracking

## 🗄️ Database Schema

### Core Models
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  wikis     Wiki[]
}

model Wiki {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  description String?
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  files       WikiFile[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model WikiFile {
  id        String   @id @default(cuid())
  fileName  String
  content   String?  // Direct content storage
  path      String   // Storage path
  wikiId    String
  wiki      Wiki     @relation(fields: [wikiId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### E2E Tests
```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/wiki.spec.ts

# Run tests in headed mode (useful for debugging)
npx playwright test --project=chromium --headed
```

**Test Coverage Areas:**
- ✅ Authentication flow (login, register, logout)
- ✅ Wiki upload and management
- ✅ Dashboard functionality
- ✅ Search functionality
- ✅ Mermaid diagram rendering
- ✅ Responsive design
- ✅ Accessibility features

## 🌐 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables

3. **Configure Production Environment**
   ```env
   # Production database (PostgreSQL recommended)
   DATABASE_URL="postgresql://username:password@host:port/database"

   # R2 Storage (required for production)
   AWS_ACCESS_KEY_ID="your-r2-access-key"
   AWS_SECRET_ACCESS_KEY="your-r2-secret-key"
   R2_BUCKET_NAME="your-bucket-name"
   R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"

   # NextAuth.js
   NEXTAUTH_URL="https://your-domain.vercel.app"
   NEXTAUTH_SECRET="your-production-secret-key"
   ```

4. **Deploy** - Vercel will automatically deploy on push

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm run start

# Or export as static site
npm run build
npm run export
```

## 🔧 Development Guide

### Adding New API Routes
```typescript
// app/api/your-endpoint/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Hello World' })
}

export async function POST(request: Request) {
  const body = await request.json()
  // Handle POST request
  return NextResponse.json({ success: true })
}
```

### Adding New Pages
```tsx
// app/your-page/page.tsx
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

export default function YourPage() {
  return (
    <ProtectedRoute>
      <div>
        <h1>Your Page</h1>
        {/* Page content */}
      </div>
    </ProtectedRoute>
  )
}
```

### Database Operations
```typescript
// Using Prisma Client
import { prisma } from '@/lib/database'

const wikis = await prisma.wiki.findMany({
  include: {
    user: true,
    files: true
  }
})

const newWiki = await prisma.wiki.create({
  data: {
    title: 'New Wiki',
    slug: 'new-wiki',
    userId: 'user-id'
  }
})
```

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Errors**
```bash
# Regenerate Prisma client
npm run db:generate

# Run migrations again
npm run db:migrate

# Check database file permissions
ls -la prisma/dev.db
```

**2. Authentication Issues**
```bash
# Check NextAuth configuration
# Verify NEXTAUTH_URL matches your local URL
# Ensure NEXTAUTH_SECRET is set
```

**3. R2 Storage Issues**
```bash
# Verify R2 credentials are correct
# Check bucket permissions
# Test with local file storage first
```

**4. Build Errors**
```bash
# Check TypeScript types
npm run type-check

# Run linter
npm run lint

# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

1. **Check logs** - Look at console output and server logs
2. **Test individually** - Use `npm run test:e2e` to verify functionality
3. **Check environment** - Verify all required environment variables are set
4. **Review documentation** - Check this README and code comments

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** - `git checkout -b feature/amazing-feature`
3. **Make your changes** - Follow existing code patterns
4. **Test your changes** - Run `npm run test` and `npm run test:e2e`
5. **Commit your changes** - Use clear commit messages
6. **Push to your fork** - `git push origin feature/amazing-feature`
7. **Open a Pull Request** - Describe your changes and why they're valuable

### Development Best Practices

- ✅ **Write tests** for new features
- ✅ **Follow TypeScript** best practices
- ✅ **Use Tailwind CSS** for styling
- ✅ **Update documentation** when adding features
- ✅ **Check accessibility** with E2E tests
- ✅ **Test on mobile** devices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** - React framework
- **Prisma** - Database toolkit
- **NextAuth.js** - Authentication solution
- **Tailwind CSS** - Utility-first CSS framework
- **Mermaid** - Diagram generation
- **R2 Storage** - Cloud storage solution
- **Playwright** - E2E testing framework

---

**🚀 Ready to start?** Follow the [Quick Start](#-quick-start-fresh-setup) guide above and you'll have a fully functional wiki system running in minutes!