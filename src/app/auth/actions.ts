'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

// --- Validation Schemas ---

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  role: z.enum(['public', 'doctor', 'student']).default('public'),
  age: z.coerce.number().int().min(1).max(120),
  gender: z.string().min(1, 'Gender is required'),
  phone: z.string().min(7, 'Phone is required').max(30),
  state: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  experience: z.string().optional(),
  clinic_name: z.string().optional(),
  course: z.string().optional(),
  college: z.string().optional(),
  academic_year: z.string().optional(),
  gotra: z.string().optional(),
  show_phone: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'doctor') {
    if (!data.qualification?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['qualification'], message: 'Qualification is required' })
    }
    if (!data.specialization?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['specialization'], message: 'Specialization is required' })
    }
    if (!data.state?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['state'], message: 'State is required' })
    }
    if (!data.district?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['district'], message: 'District is required' })
    }
    if (!data.city?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['city'], message: 'City is required' })
    }
  }

  if (data.role === 'student') {
    if (!data.course?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['course'], message: 'Course is required' })
    }
    if (!data.college?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['college'], message: 'College is required' })
    }
    if (!data.academic_year?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['academic_year'], message: 'Academic year is required' })
    }
    if (!data.state?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['state'], message: 'State is required' })
    }
    if (!data.district?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['district'], message: 'District is required' })
    }
    if (!data.city?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['city'], message: 'City is required' })
    }
  }
})

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type ProfileSeed = {
  id: string
  full_name: string
  email: string
  role: 'public' | 'doctor' | 'student'
  age: number
  gender: string
  phone: string
  state: string | null
  district: string | null
  city: string | null
  qualification: string | null
  specialization: string | null
  experience: string | null
  clinic_name: string | null
  course: string | null
  college: string | null
  academic_year: string | null
  gotra: string | null
  show_phone: boolean
}

type SignInProfileSeed = {
  id: string
  full_name: string
  email: string
}

type ProfilesUpsertClient = {
  from: (table: 'profiles') => {
    upsert: (
      values: Record<string, string | number | boolean | undefined | null>,
      options?: { onConflict?: string }
    ) => PromiseLike<{ error: { message: string } | null }>
  }
}

function isMissingColumnError(errorMessage: string | undefined) {
  if (!errorMessage) return false
  return errorMessage.includes('column') && errorMessage.includes('does not exist')
}

async function upsertProfileForSignUp(
  supabase: ProfilesUpsertClient,
  profile: ProfileSeed
): Promise<string | null> {
  const now = new Date().toISOString()
  const fullPayload = {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    age: profile.age,
    gender: profile.gender,
    phone: profile.phone,
    state: profile.state,
    district: profile.district,
    city: profile.city,
    qualification: profile.qualification,
    specialization: profile.specialization,
    experience: profile.experience,
    clinic_name: profile.clinic_name,
    course: profile.course,
    college: profile.college,
    academic_year: profile.academic_year,
    gotra: profile.gotra,
    approval_status: 'pending',
    status: 'pending',
    verified: false,
    show_phone: profile.show_phone,
    updated_at: now,
  }

  const payloads = [
    fullPayload,
    {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      approval_status: 'pending',
      status: 'pending',
      verified: false,
      show_phone: profile.show_phone,
      updated_at: now,
    },
    { id: profile.id, full_name: profile.full_name, email: profile.email, role: profile.role, approval_status: 'pending', status: 'pending', show_phone: profile.show_phone, updated_at: now },
    { id: profile.id, full_name: profile.full_name, email: profile.email, role: profile.role, approval_status: 'pending', status: 'pending', updated_at: now },
    {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      approval_status: 'pending',
      updated_at: now,
    },
    {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      status: 'pending',
      updated_at: now,
    },
    {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      updated_at: now,
    },
  ]

  let lastError: string | null = null

  for (const payload of payloads) {
    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })

    if (!error) {
      return null
    }

    lastError = error.message

    if (!isMissingColumnError(error.message)) {
      return lastError
    }
  }

  return lastError
}

async function upsertProfileForSignIn(
  supabase: ProfilesUpsertClient,
  profile: SignInProfileSeed
): Promise<string | null> {
  const now = new Date().toISOString()
  const payloads = [
    {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      updated_at: now,
    },
    {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
    },
  ]

  let lastError: string | null = null

  for (const payload of payloads) {
    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })

    if (!error) {
      return null
    }

    lastError = error.message

    if (!isMissingColumnError(error.message)) {
      return lastError
    }
  }

  return lastError
}

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function getDisplayNameFromEmail(email: string) {
  const localPart = email.split('@')[0] || 'Member'
  return localPart.replace(/[._-]+/g, ' ').trim()
}

function getReadableConnectionError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('fetch failed') || message.includes('enotfound') || message.includes('getaddrinfo')) {
      return 'Unable to reach Supabase. Check `NEXT_PUBLIC_SUPABASE_URL`, internet, and DNS.'
    }
    return error.message
  }
  return 'Unexpected server error'
}

// --- Actions ---

export async function signUp(formData: FormData) {
  const rawData = {
    email: formData.get('email')?.toString(),
    password: formData.get('password')?.toString(),
    name: formData.get('name')?.toString(),
    role: formData.get('role')?.toString() || 'public',
    age: formData.get('age')?.toString() || undefined,
    gender: formData.get('gender')?.toString() || undefined,
    phone: formData.get('phone')?.toString() || undefined,
    state: formData.get('state')?.toString() || undefined,
    district: formData.get('district')?.toString() || undefined,
    city: formData.get('city')?.toString() || undefined,
    qualification: formData.get('qualification')?.toString() || undefined,
    specialization: formData.get('specialization')?.toString() || undefined,
    experience: formData.get('experience')?.toString() || undefined,
    clinic_name: formData.get('clinicName')?.toString() || undefined,
    course: formData.get('course')?.toString() || undefined,
    college: formData.get('college')?.toString() || undefined,
    academic_year: formData.get('academicYear')?.toString() || undefined,
    gotra: formData.get('gotra')?.toString() || undefined,
    show_phone: formData.get('showPhone')?.toString() === 'on',
  }

  const validated = signUpSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const { email, password, name, role } = validated.data
  const canSharePhone = role === 'doctor' || role === 'student'
  const supabase = await createClient()

  let data: Awaited<ReturnType<typeof supabase.auth.signUp>>['data'] | null = null
  let error: Awaited<ReturnType<typeof supabase.auth.signUp>>['error'] | null = null

  try {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })
    data = result.data
    error = result.error
  } catch (caughtError) {
    return { error: getReadableConnectionError(caughtError) }
  }

  if (error) {
    return { error: error.message }
  }

  const userId = data.user?.id

  if (userId) {
    const profileError = await upsertProfileForSignUp(supabase, {
      id: userId,
      full_name: name,
      email,
      role,
      age: validated.data.age,
      gender: validated.data.gender.trim(),
      phone: validated.data.phone.trim(),
      state: validated.data.state?.trim() || null,
      district: validated.data.district?.trim() || null,
      city: validated.data.city?.trim() || null,
      qualification: validated.data.qualification?.trim() || null,
      specialization: validated.data.specialization?.trim() || null,
      experience: validated.data.experience?.trim() || null,
      clinic_name: validated.data.clinic_name?.trim() || null,
      course: validated.data.course?.trim() || null,
      college: validated.data.college?.trim() || null,
      academic_year: validated.data.academic_year?.trim() || null,
      gotra: validated.data.gotra?.trim() || null,
      show_phone: canSharePhone ? validated.data.show_phone === true : false,
    })

    if (profileError) {
      // If confirmation flow is enabled, there may be no user session yet for RLS.
      // In that case, try with service role if available, else continue and let sign-in sync it.
      if (!data.session) {
        const serviceRoleClient = createServiceRoleClient()
        if (serviceRoleClient) {
          const serviceRoleError = await upsertProfileForSignUp(serviceRoleClient, {
            id: userId,
            full_name: name,
            email,
            role,
            age: validated.data.age,
            gender: validated.data.gender.trim(),
            phone: validated.data.phone.trim(),
            state: validated.data.state?.trim() || null,
            district: validated.data.district?.trim() || null,
            city: validated.data.city?.trim() || null,
            qualification: validated.data.qualification?.trim() || null,
            specialization: validated.data.specialization?.trim() || null,
            experience: validated.data.experience?.trim() || null,
            clinic_name: validated.data.clinic_name?.trim() || null,
            course: validated.data.course?.trim() || null,
            college: validated.data.college?.trim() || null,
            academic_year: validated.data.academic_year?.trim() || null,
            gotra: validated.data.gotra?.trim() || null,
            show_phone: canSharePhone ? validated.data.show_phone === true : false,
          })
          if (serviceRoleError) {
            console.error('Profile auto-create failed after signup:', serviceRoleError)
          }
        } else {
          console.error('Profile auto-create deferred until first sign-in:', profileError)
        }
      } else {
        return { error: 'Account created but profile setup failed. Please contact support.' }
      }
    }
  }

  revalidatePath('/', 'layout')

  // If email confirmation is required, session will be null
  if (!data.session) {
    return { success: 'Account created! Please check your email for verification.' }
  }

  redirect('/dashboard')
}

export async function signIn(formData: FormData) {
  const rawData = {
    email: formData.get('email')?.toString(),
    password: formData.get('password')?.toString(),
  }

  const validated = signInSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }
  const { email, password } = validated.data
  const supabase = await createClient()

  let error: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['error'] | null = null

  try {
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    error = result.error
  } catch (caughtError) {
    return { error: getReadableConnectionError(caughtError) }
  }

  if (error) {
    return { error: error.message }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ||
      getDisplayNameFromEmail(user.email || email) ||
      'Member'

    const profileError = await upsertProfileForSignIn(supabase, {
      id: user.id,
      full_name: fullName,
      email: user.email || email,
    })

    if (profileError) {
      const serviceRoleClient = createServiceRoleClient()
      if (serviceRoleClient) {
        const serviceRoleError = await upsertProfileForSignIn(serviceRoleClient, {
          id: user.id,
          full_name: fullName,
          email: user.email || email,
        })

        if (serviceRoleError) {
          console.error('Profile sync failed after sign-in:', serviceRoleError)
        }
      } else {
        console.error('Profile sync failed after sign-in:', profileError)
      }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function getCurrentUser() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, profile: null }
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return { user, profile }
}

export async function resetPassword(formData: FormData) {
  const rawData = {
    email: formData.get('email')?.toString(),
  }

  const validated = resetPasswordSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors.email?.[0] }
  }

  const { email } = validated.data
  const supabase = await createClient()

  let error: Awaited<ReturnType<typeof supabase.auth.resetPasswordForEmail>>['error'] | null = null

  try {
    const result = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/dashboard/update-password`,
    })
    error = result.error
  } catch (caughtError) {
    return { error: getReadableConnectionError(caughtError) }
  }

  if (error) {
    return { error: error.message }
  }

  return { success: 'Check your email for the password reset link.' }
}
