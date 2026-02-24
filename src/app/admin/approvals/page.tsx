import Image from 'next/image'
import { CheckCircle2, Clock3, Phone, PhoneOff, XCircle } from 'lucide-react'
import { getDoctorVisibilityProfiles, getPendingProfiles, updateDoctorPhoneVisibility, updateProfileStatus } from './actions'

export default async function ApprovalsPage() {
  const pendingProfiles = await getPendingProfiles()
  const doctorVisibilityProfiles = await getDoctorVisibilityProfiles()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-start sm:justify-between sm:p-7">
        <div>
          <div className="inline-flex rounded-full bg-blue-900 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-50">
            Member Access
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-blue-950 dark:text-white">Pending Approvals</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
            Review new registrations and approve or reject membership access.
          </p>
        </div>
        <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <Clock3 className="mr-2 h-4 w-4" />
          {pendingProfiles.length} pending
        </div>
      </div>

      {pendingProfiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-slate-600 dark:text-gray-300">No pending approvals right now.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingProfiles.map((profile) => {
            const approveAction = updateProfileStatus.bind(null, profile.id, 'approved')
            const rejectAction = updateProfileStatus.bind(null, profile.id, 'rejected')

            return (
              <article
                key={profile.id}
                className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-gray-700 dark:bg-gray-900">
                      {profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={profile.full_name || 'Member'}
                          fill
                          sizes="48px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
                          {(profile.full_name || 'M').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-blue-950 dark:text-white">
                        {profile.full_name || 'Unnamed Member'}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">{profile.email || 'No email available'}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                        Role: {profile.role || 'public'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                        Specialty: {profile.specialty || 'Not specified'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                        Requested: {profile.created_at ? new Date(profile.created_at).toLocaleString() : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <form action={approveAction}>
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </button>
                    </form>
                    <form action={rejectAction}>
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <section className="space-y-4 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-blue-950 dark:text-white">Doctor Phone Visibility</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
              Admin can enable or disable phone visibility for verified doctors.
            </p>
          </div>
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
            {doctorVisibilityProfiles.length} doctors
          </div>
        </div>

        {doctorVisibilityProfiles.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            No verified doctors found.
          </p>
        ) : (
          <div className="grid gap-3">
            {doctorVisibilityProfiles.map((doctor) => {
              const visibilityAction = updateDoctorPhoneVisibility.bind(null, doctor.id, !doctor.show_phone)
              return (
                <article
                  key={doctor.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                      {doctor.avatar_url ? (
                        <Image
                          src={doctor.avatar_url}
                          alt={doctor.full_name || 'Doctor'}
                          fill
                          sizes="40px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
                          {(doctor.full_name || 'D').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {doctor.full_name || 'Unnamed Doctor'}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600 dark:text-gray-300">{doctor.phone || 'Phone not set'}</p>
                    </div>
                  </div>

                  <form action={visibilityAction}>
                    <button
                      type="submit"
                      className={`inline-flex items-center rounded-xl px-3 py-2 text-xs font-semibold text-white ${
                        doctor.show_phone ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {doctor.show_phone ? (
                        <>
                          <PhoneOff className="mr-1.5 h-3.5 w-3.5" />
                          Hide Phone
                        </>
                      ) : (
                        <>
                          <Phone className="mr-1.5 h-3.5 w-3.5" />
                          Show Phone
                        </>
                      )}
                    </button>
                  </form>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
