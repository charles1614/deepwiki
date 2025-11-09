# DeepWiki Architecture Documentation

**Part of**: DeepWiki Project
**Generated**: 19 November 2025
**Source commit**: 2be6259

---

## Codebase Statistics

- **Total source files analyzed**: 130 files
- **Lines of code**: 22,177 lines
- **Primary language**: TypeScript (86 files) with 7 C/C++ build files
- **Key technologies**: Next.js 15, Prisma 6, NextAuth.js 5, Tailwind CSS 3.4, Playwright 1.56, Jest 30
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: 26+ test files (unit + E2E)
- **API endpoints**: 19 REST API routes
- **Containerized**: Docker + docker-compose

---

## Documentation Structure

### 1. [Overview](overview.md)
- Project purpose and features
- Technology stack and dependencies
- Key capabilities and use cases

### 2. [System Architecture](system-architecture.md)
- High-level system design
- Component relationships and data flow
- Next.js 15 App Router architecture
- Docker containerization

### 3. [Authentication System](authentication.md)
- NextAuth.js v5 configuration
- User registration and login flow
- Role-based access control (USER/ADMIN)
- Password reset functionality
- JWT session management

### 4. [API Design](api-design.md)
- REST API architecture
- Authentication endpoints
- Wiki management endpoints
- Search and analytics endpoints
- Request/response formats

### 5. [Database Layer](database-layer.md)
- Prisma schema and models
- PostgreSQL database design
- User, Wiki, WikiFile, and WikiVersion models
- Data relationships and constraints
- Migration and seeding strategy

### 6. [Frontend Architecture](frontend-architecture.md)
- Next.js App Router structure
- Page components and routing
- UI component taxonomy
- State management patterns
- Responsive design with Tailwind CSS

### 7. [Rich Content System](rich-content-system.md)
- Markdown rendering engine
- Mermaid diagram support
- Syntax highlighting
- File upload and management
- Content sanitization

### 8. [Search System](search-system.md)
- Full-text search implementation
- Search suggestions and autocomplete
- Performance optimization
- Search indexing strategy

### 9. [Testing Infrastructure](testing-infrastructure.md)
- Unit testing with Jest
- E2E testing with Playwright
- Test coverage and patterns
- CI/CD integration
- Testing best practices

### 10. [Deployment Infrastructure](deployment-infrastructure.md)
- Docker containerization
- docker-compose configuration
- Environment management
- Production deployment
- Health checks and monitoring

### 11. [Project Evolution](project-evolution.md)
- Version history and milestones
- Recent changes and refactoring
- Technical debt and improvements
- Future roadmap and features
- Migration guides

---

## Quick Navigation

### Core Components
- **API Routes**: 19 endpoints in `app/api/`
- **Pages**: 10+ page components in `app/`
- **Database Models**: 4 core models in Prisma schema
- **Tests**: 26 test files covering auth, wiki, UI
- **UI Components**: Modular components in `components/`

### Key Features
- ✅ Complete wiki management (CRUD operations)
- ✅ Rich content support (Mermaid, syntax highlighting)
- ✅ Cloud storage integration (R2/S3 compatible)
- ✅ Role-based authentication
- ✅ Full-text search
- ✅ Analytics dashboard
- ✅ Comprehensive testing (Jest + Playwright)
- ✅ Docker containerization
- ✅ Responsive design

### Architecture Highlights
- **Next.js 15** with App Router and TypeScript
- **Prisma 6** with PostgreSQL for data persistence
- **NextAuth.js 5** for authentication and sessions
- **Tailwind CSS 3.4** for responsive styling
- **React Hook Form + Zod** for form validation
- **Docker** for containerized deployment

---

**Note**: This documentation was generated through comprehensive codebase analysis. All code references point to actual source files with line numbers. See individual section files for detailed technical documentation.
