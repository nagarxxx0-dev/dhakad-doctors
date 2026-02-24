import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import Search from './search'
import Image from 'next/image'
import { GraduationCap, Lock, MapPin, Phone, Stethoscope, User } from 'lucide-react'
import { isProfileVerified } from '@/utils/profile-utils'

const PAGE_SIZE = 12

interface DirectorySearchParams {
  q?: string
  district?: string
  state?: string
  specialization?: string
  role?: string
  page?: string
}

interface DirectoryProfile {
  id: string
  full_name: string
  avatar_url: string | null
  district: string | null
  state: string | null
  city: string | null
  role: string | null
  phone: string | null
  show_phone: boolean
  qualification: string | null
  specialization: string | null
}

function isMissingColumnError(errorMessage: string | undefined) {
  if (!errorMessage) return false
  return errorMessage.includes('column') && errorMessage.includes('does not exist')
}

function cleanParam(value: string | undefined) {
  return value?.trim() || ''
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function readBoolean(value: unknown) {
  return value === true
}

function toDirectoryProfiles(rows: Record<string, unknown>[] | null | undefined): DirectoryProfile[] {
  return (rows ?? [])
    .map((row) => {
      const id = readString(row.id)
      if (!id) return null

      return {
        id,
        full_name: readString(row.full_name) || 'Unnamed Member',
        avatar_url: readString(row.avatar_url),
        district: readString(row.district),
        state: readString(row.state),
        city: readString(row.city),
        role: readString(row.role),
        phone: readString(row.phone),
        show_phone: readBoolean(row.show_phone),
        qualification: readString(row.qualification),
        specialization: readString(row.specialization) || readString(row.specialty),
      }
    })
    .filter((profile): profile is DirectoryProfile => profile !== null)
}

function buildPageHref(filters: {
  q: string
  district: string
  state: string
  specialization: string
  role: string
  page: number
}) {
  const params = new URLSearchParams()

  if (filters.q) params.set('q', filters.q)
  if (filters.district) params.set('district', filters.district)
  if (filters.state) params.set('state', filters.state)
  if (filters.specialization) params.set('specialization', filters.specialization)
  if (filters.role) params.set('role', filters.role)
  if (filters.page > 1) params.set('page', String(filters.page))

  const queryString = params.toString()
  return queryString ? `/directory?${queryString}` : '/directory'
}

export default async function DirectoryPage(props: {
  searchParams: Promise<DirectorySearchParams>
}) {
  const searchParams = await props.searchParams
  const query = cleanParam(searchParams.q)
  const district = cleanParam(searchParams.district)
  const state = cleanParam(searchParams.state)
  const specialization = cleanParam(searchParams.specialization)
  const role = cleanParam(searchParams.role)
  const currentPage = Math.max(1, Number.parseInt(searchParams.page || '1', 10) || 1)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const supabase = await createClient()
  const specializationFields = specialization ? (['specialization', 'specialty'] as const) : ([null] as const)
  const approvalModes = ['both', 'status', 'approval_status', 'verified'] as const

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let canViewContacts = false
  if (user) {
    const { data: viewerProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    canViewContacts = isProfileVerified((viewerProfile as Record<string, unknown> | null) ?? null)
  }

  let profiles: DirectoryProfile[] = []
  let totalCount = 0
  let queryError: string | null = null

  for (const approvalMode of approvalModes) {
    let runNextApprovalMode = false

    for (const specializationField of specializationFields) {
      let dbQuery = supabase.from('profiles').select('*', { count: 'exact' })

      if (approvalMode === 'both') {
        dbQuery = dbQuery.or('status.in.(approved,verified),approval_status.in.(approved,verified),verified.eq.true')
      } else if (approvalMode === 'status') {
        dbQuery = dbQuery.in('status', ['approved', 'verified'])
      } else if (approvalMode === 'approval_status') {
        dbQuery = dbQuery.in('approval_status', ['approved', 'verified'])
      } else {
        dbQuery = dbQuery.eq('verified', true)
      }

      if (query) dbQuery = dbQuery.ilike('full_name', `%${query}%`)
      if (district) dbQuery = dbQuery.ilike('district', `%${district}%`)
      if (state) dbQuery = dbQuery.ilike('state', `%${state}%`)
      if (specialization && specializationField) dbQuery = dbQuery.ilike(specializationField, `%${specialization}%`)
      if (role) dbQuery = dbQuery.ilike('role', `%${role}%`)

      const { data, count, error } = await dbQuery
        .order('full_name', { ascending: true })
        .range(from, to)

      if (!error) {
        profiles = toDirectoryProfiles((data as Record<string, unknown>[] | null) ?? [])
        totalCount = count || 0
        queryError = null
        runNextApprovalMode = false
        break
      }

      if (isMissingColumnError(error.message)) {
        runNextApprovalMode = true
        continue
      }

      queryError = error.message
      runNextApprovalMode = false
      break
    }

    if (queryError === null || !runNextApprovalMode) {
      break
    }
  }

  if (queryError) {
    console.error('Directory query failed:', queryError)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const startPage = Math.max(1, currentPage - 2)
  const endPage = Math.min(totalPages, currentPage + 2)
  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
  const showingFrom = totalCount === 0 ? 0 : from + 1
  const showingTo = totalCount === 0 ? 0 : from + profiles.length

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:mb-8 sm:p-7">
        <div className="inline-flex rounded-full bg-blue-900 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-50">
          Approved Members
        </div>
        <div className="mt-3">
          <h1 className="text-2xl font-bold tracking-tight text-blue-950 dark:text-white sm:text-3xl">Medical Directory</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-gray-400 sm:text-base">
            Search verified doctors and students using district, state, specialization, and role filters.
          </p>
        </div>
      </div>

      <Search
        values={{
          q: query,
          district,
          state,
          specialization,
          role,
        }}
      />

      <div className="mb-6 mt-5 inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
        Showing {showingFrom}-{showingTo} of {totalCount} verified members
      </div>

      {!canViewContacts && (
        <div className="mb-6 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Register and get verified to view doctor contact details.</p>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {profiles.map((profile) => (
          <div key={profile.id} className="group overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
            <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-gray-900">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  unoptimized
                  loading="lazy"
                  decoding="async"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <User className="w-20 h-20" />
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="truncate text-lg font-bold text-blue-950 dark:text-white">{profile.full_name}</h3>
              <div className="mt-2 flex items-center text-sm text-slate-600 dark:text-gray-300">
                <Stethoscope className="mr-2 h-4 w-4 text-blue-700" />
                <span className="truncate">{profile.specialization || profile.qualification || 'Not specified'}</span>
              </div>
              <div className="mt-2 flex items-center text-sm text-slate-600 dark:text-gray-300">
                <MapPin className="mr-2 h-4 w-4 text-cyan-700" />
                <span className="truncate">
                  {profile.city || profile.district || 'City N/A'}
                  {profile.state ? `, ${profile.state}` : ''}
                </span>
              </div>
              <div className="mt-3 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                <GraduationCap className="mr-1 h-3 w-3" />
                {profile.role || 'Member'}
              </div>

              {(() => {
                const roleText = (profile.role || '').toLowerCase()
                const isDoctor = roleText.includes('doctor')
                const supportsContact = roleText.includes('doctor') || roleText.includes('student')
                const canShowPhone = supportsContact && profile.show_phone && Boolean(profile.phone) && canViewContacts

                if (!supportsContact) {
                  return null
                }

                return (
                  <div className="mt-3 space-y-2">
                    {isDoctor && (
                      <Link
                        href={`/doctors/${profile.id}`}
                        className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        View Profile
                      </Link>
                    )}
                    {canShowPhone ? (
                      <a
                        href={`tel:${profile.phone}`}
                        className="inline-flex items-center rounded-xl bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                      >
                        <Phone className="mr-1 h-3.5 w-3.5" />
                        Contact
                      </a>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        {profile.show_phone
                          ? 'Contact visible only to verified users.'
                          : 'Phone hidden by member.'}
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        ))}
        {profiles.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            No approved doctors or students found for the selected filters.
          </div>
        )}
      </div>

      {totalCount > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Link
            href={buildPageHref({
              q: query,
              district,
              state,
              specialization,
              role,
              page: Math.max(1, currentPage - 1),
            })}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              currentPage === 1
                ? 'pointer-events-none border-gray-200 text-gray-400'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            Previous
          </Link>

          {pageNumbers.map((pageNumber) => (
            <Link
              key={pageNumber}
              href={buildPageHref({
                q: query,
                district,
                state,
                specialization,
                role,
                page: pageNumber,
              })}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                pageNumber === currentPage
                  ? 'bg-blue-900 text-white'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              {pageNumber}
            </Link>
          ))}

          <Link
            href={buildPageHref({
              q: query,
              district,
              state,
              specialization,
              role,
              page: Math.min(totalPages, currentPage + 1),
            })}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              currentPage >= totalPages
                ? 'pointer-events-none border-gray-200 text-gray-400'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  )
}
