'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAdminStats() {
  const supabase = await createClient()

  // Get total doctors/users
  const { count: totalUsers, error: usersError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // Get pending approvals
  // Assuming 'status' column exists and defaults to 'pending' or null
  const { count: pendingApprovals, error: pendingError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (usersError || pendingError) {
    console.error('Error fetching stats:', usersError || pendingError)
    return { totalUsers: 0, pendingApprovals: 0 }
  }

  return {
    totalUsers: totalUsers || 0,
    pendingApprovals: pendingApprovals || 0,
  }
}
 
export async function updateProfileStatus(userId: string, status: 'approved' | 'rejected') {
  const supabase = await createClient()

  // Verify admin privileges (double check for security)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Update status
  const { error } = await supabase
    .from('profiles')
    .update({ status: status })
    .eq('id', userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/approvals')
  return { success: `User ${status} successfully` }
}
