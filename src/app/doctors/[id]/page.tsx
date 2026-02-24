import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  BriefcaseMedical,
  Lock,
  MapPin,
  MessageCircle,
  PhoneCall,
  Stethoscope,
  User,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { isProfileVerified } from '@/utils/profile-utils'

type ApprovalMode = 'both' | 'status' | 'approval_status' | 'verified'

interface DoctorProfile {
  id: string
  full_name: string
  avatar_url: string | null
  qualification: string | null
  specialization: string | null
  experience: string | null
  clinic_name: string | null
  state: string | null
  district: string | null
  city: string | null
  phone: string | null
  show_phone: boolean
  role: string | null
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function readBoolean(value: unknown) {
  return value === true
}

function isDoctorRole(role: string | null) {
  return (role || '').toLowerCase().includes('doctor')
}

function isMissingColumnError(errorMessage: string | undefined) {
  if (!errorMessage) return false
  return errorMessage.includes('column') && errorMessage.includes('does not exist')
}

function mapDoctorRow(row: Record<string, unknown> | null | undefined): DoctorProfile | null {
  if (!row) return null
  const id = readString(row.id)
  if (!id) return null

  return {
    id,
    full_name: readString(row.full_name) || 'Unnamed Doctor',
    avatar_url: readString(row.avatar_url),
    qualification: readString(row.qualification),
    specialization: readString(row.specialization) || readString(row.specialty),
    experience: readString(row.experience),
    clinic_name: readString(row.clinic_name),
    state: readString(row.state),
    district: readString(row.district),
    city: readString(row.city),
    phone: readString(row.phone),
    show_phone: readBoolean(row.show_phone),
    role: readString(row.role),
  }
}

async function fetchDoctorById(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const approvalModes: ApprovalMode[] = ['both', 'status', 'approval_status', 'verified']
  let queryError: string | null = null

  for (const mode of approvalModes) {
    let query = supabase.from('profiles').select('*').eq('id', id)

    if (mode === 'both') {
      query = query.or('status.in.(approved,verified),approval_status.in.(approved,verified),verified.eq.true')
    } else if (mode === 'status') {
      query = query.in('status', ['approved', 'verified'])
    } else if (mode === 'approval_status') {
      query = query.in('approval_status', ['approved', 'verified'])
    } else {
      query = query.eq('verified', true)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      if (isMissingColumnError(error.message)) {
        continue
      }
      queryError = error.message
      break
    }

    const doctor = mapDoctorRow((data as Record<string, unknown> | null) ?? null)
    if (!doctor) continue
    if (!isDoctorRole(doctor.role)) return null
    return doctor
  }

  if (queryError) {
    console.error('Doctor profile query failed:', queryError)
  }

  const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  const fallbackDoctor = mapDoctorRow((data as Record<string, unknown> | null) ?? null)

  if (!fallbackDoctor || !isDoctorRole(fallbackDoctor.role)) return null
  return fallbackDoctor
}

function getAddressLabel(profile: DoctorProfile) {
  const parts = [profile.clinic_name, profile.city, profile.district, profile.state]
    .map((value) => value?.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Address not provided'
}

export default async function DoctorProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let canViewContacts = false
  if (user) {
    const { data: viewerProfile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    canViewContacts = isProfileVerified((viewerProfile as Record<string, unknown> | null) ?? null)
  }

  const doctor = await fetchDoctorById(supabase, id)
  if (!doctor) {
    notFound()
  }

  const phoneForDisplay = doctor.phone || '+91 XXXXXXXXXX'
  const canShowPhone = canViewContacts && doctor.show_phone && Boolean(doctor.phone)
  const whatsappPhone = doctor.phone ? doctor.phone.replace(/\D+/g, '') : ''

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-5 inline-flex items-center text-sm font-semibold text-blue-800 hover:text-blue-700"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Home
      </Link>

      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="bg-gradient-to-r from-blue-950 to-blue-800 px-5 py-6 text-blue-50 sm:px-7">
          <h1 className="text-2xl font-bold sm:text-3xl">{doctor.full_name}</h1>
          <p className="mt-1 text-sm text-blue-100">
            {doctor.qualification || 'Medical Professional'}
            {doctor.specialization ? ` · ${doctor.specialization}` : ''}
          </p>
        </div>

        <div className="grid gap-6 p-5 sm:grid-cols-[220px,1fr] sm:p-7">
          <div className="mx-auto w-full max-w-[220px]">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-blue-100 bg-slate-100 dark:border-gray-700 dark:bg-gray-900">
              {doctor.avatar_url ? (
                <Image
                  src={doctor.avatar_url}
                  alt={doctor.full_name}
                  fill
                  sizes="220px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  <User className="h-14 w-14" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-blue-900/40 dark:bg-blue-900/20">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200">
                  <Stethoscope className="h-3.5 w-3.5" />
                  Specialization
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-gray-200">
                  {doctor.specialization || 'Not specified'}
                </p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-blue-900/40 dark:bg-blue-900/20">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200">
                  <BriefcaseMedical className="h-3.5 w-3.5" />
                  Experience
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-gray-200">
                  {doctor.experience || 'Not specified'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/60">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-gray-300">
                <MapPin className="h-3.5 w-3.5" />
                Address
              </div>
              <p className="text-sm text-slate-700 dark:text-gray-200">{getAddressLabel(doctor)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                Phone
              </p>
              {!canViewContacts ? (
                <>
                  <div className="mt-2 flex items-center gap-2 text-slate-600 dark:text-gray-300">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <span className="blur-sm select-none font-semibold">{phoneForDisplay}</span>
                  </div>
                  <Link
                    href="/signup"
                    className="mt-4 inline-flex items-center rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    Register to Contact
                  </Link>
                </>
              ) : canShowPhone ? (
                <>
                  <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{doctor.phone}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={`tel:${doctor.phone}`}
                      className="inline-flex items-center rounded-xl bg-blue-900 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      <PhoneCall className="mr-1.5 h-4 w-4" />
                      Call
                    </a>
                    {whatsappPhone && (
                      <a
                        href={`https://wa.me/${whatsappPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        <MessageCircle className="mr-1.5 h-4 w-4" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">
                  Contact number is hidden by doctor.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
