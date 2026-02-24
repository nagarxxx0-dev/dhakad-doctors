import Link from 'next/link'
import { CheckCircle2, ShieldAlert } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { isProfileVerified } from '@/utils/profile-utils'

export default async function VerifyDoctorPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  const approvalStatus =
    typeof profile?.approval_status === 'string'
      ? profile.approval_status
      : typeof profile?.status === 'string'
      ? profile.status
      : null
  const isVerified = isProfileVerified((profile as Record<string, unknown> | null) ?? null)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="mx-auto w-full max-w-xl rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          {isVerified ? (
            <CheckCircle2 className="h-7 w-7 text-green-600 mt-0.5" />
          ) : (
            <ShieldAlert className="h-7 w-7 text-red-600 mt-0.5" />
          )}
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isVerified ? 'Doctor Verified' : 'Verification Not Valid'}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {isVerified
                ? 'This ID belongs to a verified member of Dhakad Doctors.'
                : 'This QR code does not match a verified member profile.'}
            </p>
          </div>
        </div>

        {profile && (
          <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              {profile.full_name || 'Unnamed Member'}
            </p>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Specialty</p>
            <p className="text-base text-gray-900 dark:text-white">{profile.specialty || 'Not specified'}</p>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Status</p>
            <p className={`text-base font-medium ${isVerified ? 'text-green-600' : 'text-red-600'}`}>
              {approvalStatus || 'Unknown'}
            </p>
            {profile.updated_at && (
              <>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {new Date(profile.updated_at).toLocaleString()}
                </p>
              </>
            )}
          </div>
        )}

        <div className="mt-6">
          <Link href="/directory" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Back to Directory
          </Link>
        </div>
      </div>
    </div>
  )
}
