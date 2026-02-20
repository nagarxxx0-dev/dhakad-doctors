'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from '@/app/dashboard/actions'
import { Loader2, Save } from 'lucide-react'

interface ProfileData {
  avatar_url?: string | null
  full_name?: string | null
  email?: string | null
}

interface ProfileFormProps {
  profile: ProfileData | null
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = (formData: FormData) => {
    setMessage(null)
    startTransition(async () => {
      const result = await updateProfile(formData)
      
      if (result?.error) {
        const errorText = typeof result.error === 'string' 
          ? result.error 
          : 'Please check your inputs'
        setMessage({ type: 'error', text: errorText })
      } else if (result?.success) {
        setMessage({ type: 'success', text: result.success as string })
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-6">
          <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Profile Photo
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
          />
          {profile?.avatar_url && (
            <p className="mt-2 text-xs text-gray-500">Current image is set. Uploading a new one will replace it.</p>
          )}
        </div>

        <div className="sm:col-span-4">
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Full Name
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="fullName"
              id="fullName"
              defaultValue={profile?.full_name || ''}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Dr. John Doe"
              required
            />
          </div>
        </div>

        <div className="sm:col-span-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Address
          </label>
          <div className="mt-1">
            <input
              type="email"
              id="email"
              value={profile?.email || ''}
              disabled
              className="block w-full rounded-md border-gray-300 bg-gray-100 text-gray-500 shadow-sm sm:text-sm py-2 px-3 border dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Saving...
            </>
          ) : (
            <>
              <Save className="-ml-1 mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  )
}
