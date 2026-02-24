import Link from 'next/link'
import { Clock3 } from 'lucide-react'

export default function ApprovalPendingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="mx-auto w-full max-w-xl rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Clock3 className="h-7 w-7 text-orange-500 mt-0.5" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Approval Pending</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Your account is under admin review.
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to Home
          </Link>
          <Link
            href="/directory"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            View Directory
          </Link>
        </div>
      </div>
    </div>
  )
}
