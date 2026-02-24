'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function isMissingColumnError(errorMessage: string | undefined) {
  if (!errorMessage) return false
  return errorMessage.includes('column') && errorMessage.includes('does not exist')
}

export async function getAdminStats() {
  const supabase = await createClient()

  // Get total doctors/users
  const { count: totalUsers, error: usersError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { count: pendingBothCount, error: pendingBothError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .or('status.eq.pending,approval_status.eq.pending')

  let pendingApprovals = pendingBothCount
  let pendingError = pendingBothError

  if (pendingBothError && isMissingColumnError(pendingBothError.message)) {
    const { count: statusCount, error: statusError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (!statusError) {
      pendingApprovals = statusCount
      pendingError = null
    } else if (isMissingColumnError(statusError.message)) {
      const { count: approvalCount, error: approvalError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending')

      pendingApprovals = approvalCount
      pendingError = approvalError
    } else {
      pendingError = statusError
    }
  }

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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (readString(currentProfile?.role) !== 'admin') {
    return { error: 'Admin access required' }
  }

  const normalizedStatus = status === 'approved' ? 'verified' : 'rejected'

  const payloads = [
    {
      status: normalizedStatus,
      approval_status: normalizedStatus,
      verified: normalizedStatus === 'verified',
      updated_at: new Date().toISOString(),
    },
    { status: normalizedStatus, verified: normalizedStatus === 'verified', updated_at: new Date().toISOString() },
    {
      approval_status: normalizedStatus,
      verified: normalizedStatus === 'verified',
      updated_at: new Date().toISOString(),
    },
  ]

  let updateError: { message: string } | null = null

  for (const payload of payloads) {
    const { error } = await supabase
      .from('profiles')
      .update(payload)
    .eq('id', userId)

    if (!error) {
      updateError = null
      break
    }

    if (!isMissingColumnError(error.message)) {
      updateError = { message: error.message }
      break
    }

    updateError = { message: error.message }
  }

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/approvals')
  revalidatePath('/directory')
  return { success: `User ${status} successfully` }
}
