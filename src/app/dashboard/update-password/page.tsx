'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react'
import { updatePassword } from './actions'

export default function UpdatePasswordPage() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = (formData: FormData) => {
    setMessage(null)
    startTransition(async () => {
      const result = await updatePassword(formData)

      if (result?.error) {
        const errorText =
          typeof result.error === 'string'
            ? result.error
            : Object.values(result.error)[0]?.[0] || 'Unable to update password'
        setMessage({ type: 'error', text: errorText })
      } else if (result?.success) {
        setMessage({ type: 'success', text: result.success })
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <h1 className="text-3xl font-bold text-white">Set New Password</h1>
          <p className="text-blue-100 mt-2">Use a strong password with at least 8 characters.</p>
        </div>

        <div className="p-8">
          {message && (
            <div
              className={`mb-5 rounded-md border p-3 text-sm ${
                message.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              <div className="flex items-start gap-2">
                {message.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                )}
                <span>{message.text}</span>
              </div>
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  minLength={8}
                  required
                  className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
