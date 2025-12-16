# DeepWiki

🚀 **A modern wiki management system built with Next.js 15** - Upload, manage, and browse markdown documentation with interactive diagrams, cloud storage, and comprehensive authentication.

## ✨ Features

- 📚 **Complete Wiki Management** - Upload, organize, and manage markdown wikis with bulk operations
- 🎨 **Rich Content Support** - Mermaid diagrams, syntax highlighting, and enhanced markdown rendering
- ☁️ **Cloud Storage** - R2 storage integration for scalable file hosting
- 🔐 **Authentication** - NextAuth.js with role-based access (USER/ADMIN)
- 📊 **Analytics Dashboard** - Activity tracking and management interface
- 🔍 **Advanced Search** - Full-text search across wiki content
- 📱 **Responsive Design** - Mobile-friendly interface with Tailwind CSS
- 🧪 **Comprehensive Testing** - Unit tests (Jest) and E2E tests (Playwright)
- ⚡ **Performance Optimized** - Next.js 15 App Router with PostgreSQL database

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git
- PostgreSQL database
- Docker (optional, for containerized deployment)

### 1. Installation

```bash
git clone <your-repo-url>
cd deepwiki
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

**Required `.env.local` configuration:**
```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://deepwiki:devpassword@localhost:5432/deepwiki"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key"

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# R2 Storage (optional)
CLOUDFLARE_R2_BUCKET_NAME=your-bucket
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret
CLOUDFLARE_R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
```

### 3. Database Setup

```bash
# Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate

# Seed test data (optional)
npm run db:seed
```

**Test Accounts:**
- Admin: `admin@deepwiki.com` / `Admin123!`
- User: `user@deepwiki.com` / `User123!`

### 4. Start Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🐳 Docker Deployment (Recommended)

**One-Command Setup:**
```bash
docker-compose up -d
```

The app will automatically:
- ✅ Start PostgreSQL database
- ✅ Wait for database to be ready
- ✅ Run database migrations
- ✅ Seed test data
- ✅ Start the application

**Access Services:**
- 📱 App: http://localhost:3000
- 🗄️ PostgreSQL: localhost:5432
- 🔍 Prisma Studio: `docker-compose --profile tools up prisma-studio`

**Fresh Start (if needed):**
```bash
# Stop and remove everything (including data)
docker-compose down --volumes

# Start fresh (migrations & seed data run automatically)
docker-compose up -d --build
```

**Note:** All database operations are **idempotent**:
- ✅ Migrations skip if already applied
- ✅ Seed data checks for existing users before creating
- ✅ Safe to run multiple times

## 🚀 Deployment

### Docker (Recommended)

**Development:**
```bash
docker-compose up -d
```

**Production:**
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

**Services:**
- App: http://localhost:3000
- PostgreSQL: localhost:5432
- Prisma Studio: http://localhost:5555

## 📋 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
npm run format           # Format code with Prettier

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database with test data

# Testing
npm run test             # Run unit/integration tests
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run E2E tests with Playwright
```

## 🏗️ Architecture

```
deepwiki/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   ├── api/                      # API routes
│   ├── dashboard/                # Protected dashboard
│   ├── wiki/[slug]/              # Individual wiki pages
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── auth/                     # Authentication components
│   ├── layout/                   # Layout components
│   └── ui/                       # UI primitives
├── lib/                          # Utilities & configurations
│   ├── auth.ts                   # NextAuth configuration
│   ├── database.ts               # Prisma client
│   └── markdown/                 # Markdown rendering
├── prisma/                       # Database setup
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Database seeding
├── __tests__/                    # Unit tests
├── tests/e2e/                    # E2E tests
└── public/                       # Static assets
```

## 🔧 Core Features

### Wiki Management
- Upload wikis with multiple markdown files
- Bulk operations with confirmation modals
- Automatic file structure detection
- Complete R2 storage cleanup on deletion

### Rich Content
- Mermaid diagrams with zoom/pan functionality
- Syntax highlighting for code blocks
- Enhanced markdown with tables and formatting
- Responsive design for mobile devices

### Authentication & Security
- NextAuth.js v5 integration
- Role-based access control (USER/ADMIN)
- Password reset via email
- Protected routes with automatic redirects

### Search & Analytics
- Full-text search across wiki content
- Real-time search suggestions
- Activity tracking and statistics
- Management dashboard with quick actions

## 🗄️ Database Schema

**Core Models:**
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(USER)
  wikis     Wiki[]
  wikiVersions WikiVersion[]
}

model Wiki {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  description String?
  files       WikiFile[]
  versions    WikiVersion[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model WikiFile {
  id          String   @id @default(cuid())
  wikiId      String
  fileName    String
  filePath    String   @unique
  fileSize    Int
  contentType String
  content     String?
  wiki        Wiki     @relation(fields: [wikiId], references: [id], onDelete: Cascade)
}

model WikiVersion {
  id        String   @id @default(cuid())
  wikiId    String
  version   Int
  content   String
  changeLog String?
  userId    String
  wiki      Wiki     @relation(fields: [wikiId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## 🧪 Testing

**Unit Tests:**
```bash
npm run test              # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
```

**E2E Tests:**
```bash
npm run test:e2e          # Run all E2E tests
npx playwright test       # Alternative command
```

**Test Coverage:**
- ✅ Authentication flow (login, register, logout)
- ✅ Wiki upload and management
- ✅ Dashboard functionality
- ✅ Search functionality
- ✅ Mermaid diagram rendering
- ✅ Responsive design
- ✅ Accessibility features

## 🚀 Deployment

### Docker (Recommended)
- Development: `docker-compose up -d`
- Production: `docker-compose -f docker-compose.prod.yml up -d --build`

### Vercel (Alternative)
1. Push to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy automatically

### HTTPS with Let's Encrypt (Production)

For secure public deployment with a custom domain (e.g., `wiki.litenext.digital`):

#### 1. Start Docker container (bound to localhost only)
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

#### 2. Install Certbot and Nginx
```bash
sudo apt update
sudo apt install -y certbot nginx
```

#### 3. Get Let's Encrypt certificate
```bash
sudo mkdir -p /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot -d wiki.litenext.digital
```

#### 4. Configure Nginx

> [!IMPORTANT]
> Update `server_name` and SSL certificate paths in `nginx/deepwiki.conf` to match your domain before copying.

```bash
sudo cp nginx/deepwiki.conf /etc/nginx/sites-available/deepwiki
sudo ln -s /etc/nginx/sites-available/deepwiki /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

#### 5. Auto-renewal (cron job)
```bash
echo "0 0,12 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" | sudo tee /etc/cron.d/certbot-renew
```

Your DeepWiki instance will now be accessible via HTTPS at your domain!

### Manual Deployment
```bash
npm run build && npm run start
```

## 🐛 Troubleshooting

**Database Issues:**
```bash
npm run db:generate      # Regenerate Prisma client
npm run db:migrate       # Run migrations
```

**Build Errors:**
```bash
npm run type-check       # Check TypeScript types
npm run lint            # Run ESLint
```

**Authentication Issues:**
- Verify NEXTAUTH_URL matches your local URL
- Ensure NEXTAUTH_SECRET is set
- Check environment configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Commit changes with clear messages
5. Push to your fork and open a Pull Request

**Development Best Practices:**
- Write tests for new features
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Test on mobile devices
- Check accessibility

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Built with: Next.js, Prisma, NextAuth.js, Tailwind CSS, Mermaid, and Playwright.

---

**🚀 Ready to start?** Follow the Quick Start guide above and you'll have a fully functional wiki system running in minutes!