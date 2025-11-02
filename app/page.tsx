import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm text-center">
        <h1 className="text-4xl font-bold">Welcome to DeepWiki</h1>
        <p className="mt-4 text-lg">
          Built with Claude Code scaffolding
        </p>
        <div className="mt-8 space-x-4">
          <Link
            href="/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 font-medium"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}