import { RegisterForm } from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div>
      <h2 className="text-center text-2xl font-bold text-gray-900">Create your account</h2>
      <p className="mt-2 text-center text-sm text-gray-600">
        Or{' '}
        <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
          sign in to your existing account
        </a>
      </p>
      <div className="mt-8">
        <RegisterForm />
      </div>
    </div>
  )
}