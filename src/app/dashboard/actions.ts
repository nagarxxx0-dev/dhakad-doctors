'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { normalizeRole } from '@/utils/profile-utils'
import { uploadPublicFile } from '@/utils/storage/public-upload'

const profileSchema = z.object({
  fullName: z.string().min(3, 'Name must be at least 3 characters'),
})

function cleanText(value: FormDataEntryValue | null, maxLength = 120) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

function isMissingColumnError(errorMessage: string | undefined) {
  if (!errorMessage) return false
  return errorMessage.includes('column') && errorMessage.includes('does not exist')
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const fullName = formData.get('fullName') as string
  const avatarFile = formData.get('avatar') as File
  const roleInput = cleanText(formData.get('role'))
  const phone = cleanText(formData.get('phone'), 30)
  const gender = cleanText(formData.get('gender'), 30)
  const ageInput = cleanText(formData.get('age'), 3)
  const state = cleanText(formData.get('state'))
  const district = cleanText(formData.get('district'))
  const city = cleanText(formData.get('city'))
  const qualification = cleanText(formData.get('qualification'))
  const specialization = cleanText(formData.get('specialization'))
  const experience = cleanText(formData.get('experience'))
  const clinicName = cleanText(formData.get('clinicName'))
  const course = cleanText(formData.get('course'))
  const college = cleanText(formData.get('college'))
  const academicYear = cleanText(formData.get('academicYear'))
  const gotra = cleanText(formData.get('gotra'))
  const showPhone = formData.get('showPhone') === 'on'

  const validated = profileSchema.safeParse({ fullName })

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  let age: number | null = null
  if (ageInput) {
    const parsedAge = Number.parseInt(ageInput, 10)
    if (Number.isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) {
      return { error: 'Age must be between 0 and 120' }
    }
    age = parsedAge
  }

  let avatarUrl = null

  // Handle File Upload if a new file is selected
  if (avatarFile && avatarFile.size > 0) {
    const upload = await uploadPublicFile({
      supabase,
      file: avatarFile,
      ownerId: user.id,
      supabaseBucket: 'avatars',
    })

    if (upload.error || !upload.url) {
      console.error('Avatar upload error:', upload.error)
      return { error: 'Failed to upload image. Please try again.' }
    }

    avatarUrl = upload.url
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const existingRole = normalizeRole(existingProfile?.role)
  const requestedRole = normalizeRole(roleInput)
  const role = existingRole === 'admin' ? 'admin' : requestedRole
  const canSharePhone = role === 'doctor' || role === 'student'

  const updates: Record<string, string | number | boolean | null> = {
    full_name: fullName,
    role,
    age,
    gender,
    phone,
    state,
    district,
    city,
    qualification,
    specialization,
    experience,
    clinic_name: clinicName,
    course,
    college,
    academic_year: academicYear,
    gotra,
    show_phone: canSharePhone ? showPhone : false,
    updated_at: new Date().toISOString(),
  }

  if (avatarUrl) {
    updates.avatar_url = avatarUrl
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    if (isMissingColumnError(error.message)) {
      return { error: 'Profile schema outdated. Run latest Supabase migration and retry.' }
    }
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/profile')
  
  return { success: 'Profile updated successfully' }
}
