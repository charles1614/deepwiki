# DeepWiki

A Next.js application built with Claude Code scaffolding.

## Features

- ⚡ **Next.js 15** with App Router
- 🎨 **Tailwind CSS** for styling
- 🔷 **TypeScript** for type safety
- 📦 **ESLint** & **Prettier** for code quality
- 🧪 **Jest & React Testing Library** for testing
- 🖼️ **Image optimization** with modern formats
- 🔒 **Security headers** configured
- 🚀 **Optimized build** with package imports

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration values.

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)** in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## Project Structure

```
deepwiki/
├── app/                    # App Router directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Home page
│   └── api/              # API routes
├── components/            # Reusable components
│   └── ui/               # UI primitives
├── lib/                  # Utilities and configurations
├── public/               # Static assets
├── types/                # TypeScript type definitions
└── README.md
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy automatically

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
   ```

## Development

### Adding New Pages

Create new pages in the `app/` directory. For example, to create an about page:

```tsx
// app/about/page.tsx
export default function AboutPage() {
  return <div>About DeepWiki</div>;
}
```

### Creating Components

Add reusable components to the `components/` directory:

```tsx
// components/ui/button.tsx
export function Button({ children, ...props }) {
  return (
    <button className="px-4 py-2 bg-blue-500 text-white rounded" {...props}>
      {children}
    </button>
  );
}
```

### API Routes

Create API endpoints in the `app/api/` directory:

```tsx
// app/api/hello/route.ts
import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ message: 'Hello, DeepWiki!' });
}
```

### Testing

The project includes a complete testing setup with Jest and React Testing Library:

```tsx
// __tests__/example.test.tsx
import { render, screen } from '@testing-library/react'
import Home from '../app/page'

describe('Home Page', () => {
  it('renders a heading with DeepWiki title', () => {
    render(<Home />)

    const heading = screen.getByRole('heading', { name: /welcome to deepwiki/i })

    expect(heading).toBeInTheDocument()
  })
})
```

Run tests with:
- `npm run test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Testing:** [Jest](https://jestjs.io/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- **Code Quality:** [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).