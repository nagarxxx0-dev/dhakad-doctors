import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './form'
import { signOut } from '@/app/auth/actions'
import { isProfileVerified, normalizeRole } from '@/utils/profile-utils'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const role = normalizeRole(profile?.role)
  const roleLabel = role === 'admin' ? 'Admin' : role === 'doctor' ? 'Doctor' : role === 'student' ? 'Medical Student' : 'Public User'
  const verificationLabel = isProfileVerified((profile as Record<string, unknown> | null) ?? null)
    ? 'Verified'
    : 'Pending'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Edit Profile
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update your personal information and account details.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">
              Role: {roleLabel}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Status: {verificationLabel}
            </span>
          </div>
        </div>
        <form action={signOut} className="mt-4 md:mt-0">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            Logout
          </button>
        </form>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <ProfileForm profile={profile} />
      </div>
    </div>
  )
}
