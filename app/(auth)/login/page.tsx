import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div>
      <h2 className="text-center text-2xl font-bold text-gray-900">Sign in to your account</h2>
      <p className="mt-2 text-center text-sm text-gray-600">
        Or{' '}
        <a href="/register" className="font-medium text-blue-600 hover:text-blue-500">
          create a new account
        </a>
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  )
}