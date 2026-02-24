import Link from 'next/link'
import Image from 'next/image'
import { MapPin, MessageCircle, PhoneCall, Search, Stethoscope, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { isProfileVerified } from '@/utils/profile-utils'

type ApprovalMode = 'both' | 'status' | 'approval_status' | 'verified'

interface DoctorCard {
  id: string
  full_name: string
  avatar_url: string | null
  qualification: string | null
  specialization: string | null
  experience: string | null
  state: string | null
  district: string | null
  city: string | null
  phone: string | null
  show_phone: boolean
  role: string | null
}

function cleanParam(value: string | null | undefined) {
  return value?.trim() || ''
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function readBoolean(value: unknown) {
  return value === true
}

function isMissingColumnError(errorMessage: string | undefined) {
  if (!errorMessage) return false
  return errorMessage.includes('column') && errorMessage.includes('does not exist')
}

function isDoctorRole(role: string | null) {
  return (role || '').toLowerCase().includes('doctor')
}

function mapDoctorRows(rows: Record<string, unknown>[] | null | undefined): DoctorCard[] {
  return (rows ?? [])
    .map((row) => {
      const id = readString(row.id)
      if (!id) return null

      return {
        id,
        full_name: readString(row.full_name) || 'Unnamed Doctor',
        avatar_url: readString(row.avatar_url),
        qualification: readString(row.qualification),
        specialization: readString(row.specialization) || readString(row.specialty),
        experience: readString(row.experience),
        state: readString(row.state),
        district: readString(row.district),
        city: readString(row.city),
        phone: readString(row.phone),
        show_phone: readBoolean(row.show_phone),
        role: readString(row.role),
      }
    })
    .filter((profile): profile is DoctorCard => profile !== null)
}

export default async function HomeDoctorDirectory({
  q,
  state,
  district,
  specialization = '',
  city = '',
}: {
  q: string
  state: string
  district: string
  specialization?: string
  city?: string
}) {
  const supabase = await createClient()
  const approvalModes: ApprovalMode[] = ['both', 'status', 'approval_status', 'verified']
  const roleModes = ['role_filter', 'no_role_filter'] as const

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let viewerVerified = false
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    viewerVerified = isProfileVerified((profile as Record<string, unknown> | null) ?? null)
  }

  let doctors: DoctorCard[] = []
  let queryError: string | null = null

  for (const approvalMode of approvalModes) {
    let moveToNextApprovalMode = false

    for (const roleMode of roleModes) {
      let dbQuery = supabase.from('profiles').select('*').order('full_name', { ascending: true })

      if (approvalMode === 'both') {
        dbQuery = dbQuery.or('status.in.(approved,verified),approval_status.in.(approved,verified),verified.eq.true')
      } else if (approvalMode === 'status') {
        dbQuery = dbQuery.in('status', ['approved', 'verified'])
      } else if (approvalMode === 'approval_status') {
        dbQuery = dbQuery.in('approval_status', ['approved', 'verified'])
      } else {
        dbQuery = dbQuery.eq('verified', true)
      }

      if (q) dbQuery = dbQuery.ilike('full_name', `%${q}%`)
      if (state) dbQuery = dbQuery.ilike('state', `%${state}%`)
      if (district) dbQuery = dbQuery.ilike('district', `%${district}%`)
      if (specialization) dbQuery = dbQuery.ilike('specialization', `%${specialization}%`)
      if (city) dbQuery = dbQuery.ilike('city', `%${city}%`)
      if (roleMode === 'role_filter') dbQuery = dbQuery.ilike('role', '%doctor%')
      if (!viewerVerified) dbQuery = dbQuery.limit(24)

      const { data, error } = await dbQuery
      if (!error) {
        const mapped = mapDoctorRows((data as Record<string, unknown>[] | null) ?? [])
        const filtered = roleMode === 'role_filter' ? mapped : mapped.filter((row) => isDoctorRole(row.role))
        doctors = filtered.length > 0 ? filtered : mapped
        queryError = null
        moveToNextApprovalMode = false
        break
      }

      if (isMissingColumnError(error.message)) {
        moveToNextApprovalMode = true
        continue
      }

      queryError = error.message
      moveToNextApprovalMode = false
      break
    }

    if (queryError === null || !moveToNextApprovalMode) {
      break
    }
  }

  if (queryError) {
    console.error('Home doctor list query failed:', queryError)
  }

  return (
    <section className="bg-white py-12 dark:bg-gray-900 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:mb-8 sm:p-7">
          <div className="inline-flex rounded-full bg-blue-900 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-50">
            {viewerVerified ? 'Verified View' : 'Guest View'}
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-blue-950 dark:text-white sm:text-3xl">
            Home Directory
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-gray-300 sm:text-base">
            {viewerVerified
              ? 'Full contact directory with specialization and city filters.'
              : 'Quick directory widget. Register for contact access.'}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <form
              action="/"
              method="get"
              className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <h3 className="text-sm font-bold uppercase tracking-wide text-blue-900 dark:text-blue-300">
                Directory Widget
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">Search and apply quick filters</p>

              <div className="mt-3 space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    name="q"
                    defaultValue={q}
                    placeholder="Doctor name"
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {viewerVerified ? (
                  <>
                    <input
                      name="specialization"
                      defaultValue={specialization}
                      placeholder="Specialization"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                    <input
                      name="city"
                      defaultValue={city}
                      placeholder="City"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </>
                ) : (
                  <>
                    <input
                      name="state"
                      defaultValue={state}
                      placeholder="State"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                    <input
                      name="district"
                      defaultValue={district}
                      placeholder="District"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Apply
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Reset
                </Link>
              </div>
            </form>

            <div className="rounded-2xl border border-blue-100 bg-blue-950 px-4 py-4 text-blue-50 shadow-sm dark:border-blue-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Directory Count</p>
              <p className="mt-2 text-3xl font-bold">{doctors.length}</p>
              <p className="mt-1 text-xs text-blue-200">Verified doctors visible for current filters</p>
            </div>

            {!viewerVerified && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                Register &amp; get verified to contact doctors.
              </div>
            )}
          </aside>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-blue-950 dark:text-white">Doctor Cards</h3>
              <Link href="/directory" className="text-sm font-semibold text-blue-800 hover:text-blue-700">
                Open Full Directory
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {doctors.map((doctor) => (
                <article
                  key={doctor.id}
                  className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-blue-100 bg-blue-50 dark:border-gray-700 dark:bg-blue-950/30">
                      {doctor.avatar_url ? (
                        <Image
                          src={doctor.avatar_url}
                          alt={doctor.full_name}
                          fill
                          sizes="48px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-blue-700 dark:text-blue-300">
                          <User className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-blue-950 dark:text-white">{doctor.full_name}</h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                        {doctor.qualification || 'Medical Professional'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center text-sm text-slate-600 dark:text-gray-300">
                    <Stethoscope className="mr-2 h-4 w-4 text-blue-700" />
                    <span className="truncate">{doctor.specialization || 'Specialization not specified'}</span>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-slate-600 dark:text-gray-300">
                    <MapPin className="mr-2 h-4 w-4 text-cyan-700" />
                    <span className="truncate">
                      {cleanParam(doctor.city) || cleanParam(doctor.district) || 'City N/A'}
                      {doctor.state ? `, ${doctor.state}` : ''}
                    </span>
                  </div>

                  {doctor.experience && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">Experience: {doctor.experience}</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/doctors/${doctor.id}`}
                      className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      View Profile
                    </Link>
                    {viewerVerified && doctor.show_phone && doctor.phone && (
                      <>
                        <a
                          href={`tel:${doctor.phone}`}
                          className="inline-flex items-center rounded-xl bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                        >
                          <PhoneCall className="mr-1 h-3.5 w-3.5" />
                          Call
                        </a>
                        <a
                          href={`https://wa.me/${doctor.phone.replace(/\\D+/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <MessageCircle className="mr-1 h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      </>
                    )}
                  </div>
                </article>
              ))}

              {doctors.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  No doctors found for current filters.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
