import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import IdCardView from './id-card-view'

export default async function IdCardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Digital ID Card</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View and download your official membership card.
        </p>
      </div>

      <IdCardView user={user} profile={profile} />
    </div>
  )
}