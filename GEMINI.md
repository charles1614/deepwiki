## Project Overview

This is a Next.js 15 project called "DeepWiki", a comprehensive wiki management system. It allows users to upload, manage, and browse markdown documentation with interactive diagrams, Mermaid support, and R2 cloud storage integration.

**Key Technologies:**

*   **Framework:** Next.js 15
*   **Database:** Prisma with PostgreSQL
*   **Authentication:** NextAuth.js
*   **Styling:** Tailwind CSS
*   **Markdown:** `marked`, `gray-matter`, `react-syntax-highlighter`, `mermaid`
*   **File Storage:** Cloudflare R2 (via `@aws-sdk/client-s3`)
*   **Forms:** `react-hook-form` and `zod`
*   **Testing:** Jest, React Testing Library, and Playwright

**Architecture:**

The project uses the Next.js App Router. API routes are located in `app/api`, and pages are in the `app` directory. Components are in `components`, and shared libraries/utilities are in `lib`. The database schema is defined in `prisma/schema.prisma`.

## Building and Running

**1. Installation:**

```bash
npm install
```

**2. Environment Setup:**

Copy `.env.example` to `.env.local` and fill in the required variables. For local development, you only need to set `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`.

```bash
cp .env.example .env.local
```

**3. Database Setup:**

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database with test users (optional)
npm run db:seed
```

**4. Running the Development Server:**

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Testing

**Unit & Integration Tests (Jest):**

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch
```

**End-to-End Tests (Playwright):**

```bash
# Install Playwright browsers (one-time setup)
npx playwright install

# Run all E2E tests
npm run test:e2e
```

## Development Conventions

*   **Code Style:** The project uses Prettier for code formatting. Run `npm run format` to format the code.
*   **Linting:** ESLint is used for linting. Run `npm run lint` to check for linting errors.
*   **Type Checking:** The project is written in TypeScript. Run `npm run type-check` to check for type errors.
*   **Commits:** Follow conventional commit standards.
*   **Branching:** Create feature branches from `main`.
*   **Pull Requests:** Open pull requests for new features and bug fixes. Ensure all tests pass before merging.
