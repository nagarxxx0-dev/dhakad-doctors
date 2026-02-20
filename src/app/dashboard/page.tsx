import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, Settings, UserCircle } from 'lucide-react'

export default async function DashboardPage() {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome, {profile?.full_name || user.email}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your profile, view your ID card, and connect with the community.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile Card */}
        <Link href="/dashboard/profile" className="block group">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200">
            <div className="p-6 flex items-start space-x-4">
              <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Edit Profile
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Update your personal details, photo, and contact info.
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* ID Card Link */}
        <Link href="/dashboard/id-card" className="block group">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-green-300 dark:hover:border-green-700 transition-all duration-200">
            <div className="p-6 flex items-start space-x-4">
              <div className="flex-shrink-0 bg-green-50 dark:bg-green-900/30 rounded-lg p-3 group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition-colors">
                <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                  Digital ID Card
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  View your official doctor membership card.
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* Directory Link (Placeholder for future) */}
        <Link href="/directory" className="block group">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200">
            <div className="p-6 flex items-start space-x-4">
              <div className="flex-shrink-0 bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
                <UserCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Member Directory
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Find and connect with other doctors.
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
