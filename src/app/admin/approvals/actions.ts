'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface PendingProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  role: string | null
  specialty: string | null
  created_at: string | null
  status: string | null
  approval_status: string | null
}

export interface DoctorVisibilityProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  show_phone: boolean
  role: string | null
  status: string | null
  approval_status: string | null
  verified: boolean
}

type ProfileRow = Record<string, unknown>

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function readBoolean(value: unknown): boolean {
  return value === true
}

function isMissingColumnError(errorMessage: string | undefined) {
  if (!errorMessage) return false
  return errorMessage.includes('column') && errorMessage.includes('does not exist')
}

function mapPendingProfiles(data: ProfileRow[] | null | undefined): PendingProfile[] {
  return (data ?? []).map((row) => ({
    id: readString(row.id) || '',
    full_name: readString(row.full_name),
    avatar_url: readString(row.avatar_url),
    email: readString(row.email),
    role: readString(row.role),
    specialty: readString(row.specialty),
    created_at: readString(row.created_at),
    status: readString(row.status),
    approval_status: readString(row.approval_status),
  }))
}

function mapDoctorVisibilityProfiles(data: ProfileRow[] | null | undefined): DoctorVisibilityProfile[] {
  return (data ?? [])
    .map((row) => ({
      id: readString(row.id) || '',
      full_name: readString(row.full_name),
      avatar_url: readString(row.avatar_url),
      phone: readString(row.phone),
      show_phone: readBoolean(row.show_phone),
      role: readString(row.role),
      status: readString(row.status),
      approval_status: readString(row.approval_status),
      verified: readBoolean(row.verified),
    }))
    .filter((row) => row.id)
}

export async function getPendingProfiles(): Promise<PendingProfile[]> {
  const supabase = await createClient()

  const { data: bothData, error: bothError } = await supabase
    .from('profiles')
    .select('*')
    .or('status.eq.pending,approval_status.eq.pending')
    .order('created_at', { ascending: true })

  if (!bothError) {
    return mapPendingProfiles((bothData as ProfileRow[]) ?? [])
  }

  if (!isMissingColumnError(bothError.message)) {
    console.error('Error fetching pending profiles:', bothError)
    return []
  }

  const { data: statusData, error: statusError } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (!statusError) {
    return mapPendingProfiles((statusData as ProfileRow[]) ?? [])
  }

  if (!isMissingColumnError(statusError.message)) {
    console.error('Error fetching pending profiles by status:', statusError)
    return []
  }

  const { data: approvalData, error: approvalError } = await supabase
    .from('profiles')
    .select('*')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true })

  if (approvalError) {
    console.error('Error fetching pending profiles by approval_status:', approvalError)
    return []
  }

  return mapPendingProfiles((approvalData as ProfileRow[]) ?? [])
}

export async function getDoctorVisibilityProfiles(): Promise<DoctorVisibilityProfile[]> {
  const supabase = await createClient()
  const approvalModes = ['both', 'status', 'approval_status', 'verified', 'none'] as const

  for (const mode of approvalModes) {
    let query = supabase.from('profiles').select('*').ilike('role', '%doctor%').order('full_name', { ascending: true })

    if (mode === 'both') {
      query = query.or('status.in.(approved,verified),approval_status.in.(approved,verified),verified.eq.true')
    } else if (mode === 'status') {
      query = query.in('status', ['approved', 'verified'])
    } else if (mode === 'approval_status') {
      query = query.in('approval_status', ['approved', 'verified'])
    } else if (mode === 'verified') {
      query = query.eq('verified', true)
    }

    const { data, error } = await query
    if (!error) {
      return mapDoctorVisibilityProfiles((data as ProfileRow[]) ?? [])
    }

    if (!isMissingColumnError(error.message)) {
      console.error('Error fetching doctor visibility profiles:', error.message)
      return []
    }
  }

  return []
}

export async function updateProfileStatus(userId: string, status: 'approved' | 'rejected'): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('Unauthorized attempt to update profile status')
    return
  }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (readString(currentProfile?.role) !== 'admin') {
    console.error('Non-admin attempted to update profile status')
    return
  }

  const normalizedStatus = status === 'approved' ? 'verified' : 'rejected'

  const updatePayloads = [
    {
      status: normalizedStatus,
      approval_status: normalizedStatus,
      verified: normalizedStatus === 'verified',
      updated_at: new Date().toISOString(),
    },
    {
      status: normalizedStatus,
      verified: normalizedStatus === 'verified',
      updated_at: new Date().toISOString(),
    },
    {
      approval_status: normalizedStatus,
      verified: normalizedStatus === 'verified',
      updated_at: new Date().toISOString(),
    },
  ]

  let updateSucceeded = false
  for (const payload of updatePayloads) {
    const { error } = await supabase.from('profiles').update(payload).eq('id', userId)

    if (!error) {
      updateSucceeded = true
      break
    }

    if (!isMissingColumnError(error.message)) {
      console.error('Failed to update profile status:', error.message)
      return
    }
  }

  if (!updateSucceeded) {
    console.error('Failed to update profile status: missing both status and approval_status columns')
    return
  }

  revalidatePath('/admin')
  revalidatePath('/admin/approvals')
  revalidatePath('/directory')
}

export async function updateDoctorPhoneVisibility(userId: string, showPhone: boolean): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('Unauthorized attempt to update phone visibility')
    return
  }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (readString(currentProfile?.role) !== 'admin') {
    console.error('Non-admin attempted to update phone visibility')
    return
  }

  const updatePayloads = [
    { show_phone: showPhone, updated_at: new Date().toISOString() },
    { show_phone: showPhone },
  ]

  for (const payload of updatePayloads) {
    const { error } = await supabase.from('profiles').update(payload).eq('id', userId).ilike('role', '%doctor%')
    if (!error) {
      revalidatePath('/admin/approvals')
      revalidatePath('/directory')
      revalidatePath('/')
      return
    }

    if (!isMissingColumnError(error.message)) {
      console.error('Failed to update doctor phone visibility:', error.message)
      return
    }
  }

  console.error('Failed to update doctor phone visibility: show_phone column missing')
}
