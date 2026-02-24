import CommitteeManager from './committee-manager'
import { getApprovedProfilesForCommittee, getCommitteeMembers } from './actions'

export default async function AdminCommitteePage() {
  const { members, error } = await getCommitteeMembers()
  const { profiles: approvedProfiles, error: profilesError } = await getApprovedProfilesForCommittee()
  const combinedError = error || profilesError

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-7">
        <div className="inline-flex rounded-full bg-blue-900 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-50">
          3-Tier Structure
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-blue-950 dark:text-white sm:text-3xl">
          Committee Management
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
          Manage National, State, and District committee members with rank ordering.
        </p>
      </div>

      {combinedError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {combinedError}
        </div>
      )}

      <CommitteeManager initialMembers={members} approvedProfiles={approvedProfiles} />
    </div>
  )
}
