import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Authentication failed</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              We could not complete your authentication request. Please try again.
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to Login
          </Link>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Reset Password
          </Link>
        </div>
      </div>
    </div>
  )
}
