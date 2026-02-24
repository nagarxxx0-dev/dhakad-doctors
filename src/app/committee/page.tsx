import Image from 'next/image'
import { Building2, Globe2, Layers3, MapPinned, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import type { ComponentType } from 'react'
import { isVerifiedStatusValue } from '@/utils/profile-utils'

type TierKey = 'national' | 'state' | 'district'

interface CommitteeMember {
  id: string
  name: string
  designation: string | null
  tier: TierKey
  state: string | null
  district: string | null
  rank: number | null
  avatar_url: string | null
}

interface StateGroup {
  state: string
  members: CommitteeMember[]
}

interface DistrictGroup {
  state: string
  districts: Array<{
    district: string
    members: CommitteeMember[]
  }>
}

const TIER_ORDER: TierKey[] = ['national', 'state', 'district']

const TIER_META: Record<TierKey, { title: string; description: string; icon: ComponentType<{ className?: string }> }> = {
  national: {
    title: 'National Committee',
    description: 'Top-level national leadership and core decision-makers.',
    icon: Globe2,
  },
  state: {
    title: 'State Committee',
    description: 'State-level coordination and governance members.',
    icon: Building2,
  },
  district: {
    title: 'District Committee',
    description: 'District-level representatives and local coordinators.',
    icon: MapPinned,
  },
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null
}

function readRank(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeTier(value: string | null): TierKey | null {
  if (!value) return null
  const normalized = value.toLowerCase()
  if (normalized.startsWith('nat')) return 'national'
  if (normalized.startsWith('sta')) return 'state'
  if (normalized.startsWith('dis')) return 'district'
  return null
}

function isMissingSchemaError(errorMessage: string | undefined) {
  if (!errorMessage) return false
  return (
    errorMessage.includes('does not exist') ||
    errorMessage.includes('column') ||
    errorMessage.includes('relation')
  )
}

function mapCommitteeRows(rows: Record<string, unknown>[] | null | undefined): CommitteeMember[] {
  return (rows ?? [])
    .map((row, index) => {
      const tier = normalizeTier(
        readString(row.tier) || readString(row.level) || readString(row.committee_tier)
      )
      if (!tier) return null

      const approvalStatus = readString(row.approval_status) || readString(row.status)
      if (approvalStatus && !isVerifiedStatusValue(approvalStatus)) {
        return null
      }

      const id = readString(row.id) || readString(row.user_id) || `${tier}-${index}`
      const name =
        readString(row.full_name) ||
        readString(row.name) ||
        readString(row.member_name) ||
        'Unnamed Member'

      return {
        id,
        name,
        designation:
          readString(row.designation) ||
          readString(row.title) ||
          readString(row.position) ||
          readString(row.role),
        tier,
        state: readString(row.state),
        district: readString(row.district),
        rank: readRank(row.rank) || readRank(row.position_rank) || readRank(row.committee_rank),
        avatar_url: readString(row.avatar_url) || readString(row.photo_url),
      }
    })
    .filter((member): member is CommitteeMember => member !== null)
}

function sortMembersByRankAndName(a: CommitteeMember, b: CommitteeMember) {
  const ar = a.rank ?? Number.MAX_SAFE_INTEGER
  const br = b.rank ?? Number.MAX_SAFE_INTEGER
  if (ar !== br) return ar - br
  return a.name.localeCompare(b.name)
}

function groupStateCommittee(members: CommitteeMember[]): StateGroup[] {
  const grouped = new Map<string, CommitteeMember[]>()

  for (const member of members) {
    const key = member.state || 'Unspecified State'
    const existing = grouped.get(key) || []
    existing.push(member)
    grouped.set(key, existing)
  }

  return Array.from(grouped.entries())
    .map(([state, stateMembers]) => ({
      state,
      members: stateMembers.sort(sortMembersByRankAndName),
    }))
    .sort((a, b) => a.state.localeCompare(b.state))
}

function groupDistrictCommittee(members: CommitteeMember[]): DistrictGroup[] {
  const stateMap = new Map<string, Map<string, CommitteeMember[]>>()

  for (const member of members) {
    const stateKey = member.state || 'Unspecified State'
    const districtKey = member.district || 'Unspecified District'

    const districtMap = stateMap.get(stateKey) || new Map<string, CommitteeMember[]>()
    const districtMembers = districtMap.get(districtKey) || []
    districtMembers.push(member)
    districtMap.set(districtKey, districtMembers)
    stateMap.set(stateKey, districtMap)
  }

  return Array.from(stateMap.entries())
    .map(([state, districtMap]) => ({
      state,
      districts: Array.from(districtMap.entries())
        .map(([district, districtMembers]) => ({
          district,
          members: districtMembers.sort(sortMembersByRankAndName),
        }))
        .sort((a, b) => a.district.localeCompare(b.district)),
    }))
    .sort((a, b) => a.state.localeCompare(b.state))
}

async function fetchCommitteeMembers() {
  const supabase = await createClient()
  const tableCandidates = ['committee_members', 'committees', 'profiles']
  const grouped: Record<TierKey, CommitteeMember[]> = {
    national: [],
    state: [],
    district: [],
  }

  let lastError: string | null = null

  for (const table of tableCandidates) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('rank', { ascending: true })

    if (error) {
      if (isMissingSchemaError(error.message)) {
        lastError = error.message
        continue
      }

      return { grouped, errorMessage: error.message }
    }

    const members = mapCommitteeRows((data as Record<string, unknown>[] | null) ?? [])

    for (const member of members) {
      grouped[member.tier].push(member)
    }

    for (const tier of TIER_ORDER) {
      grouped[tier].sort((a, b) => {
        const ar = a.rank ?? Number.MAX_SAFE_INTEGER
        const br = b.rank ?? Number.MAX_SAFE_INTEGER
        if (ar !== br) return ar - br
        return a.name.localeCompare(b.name)
      })
    }

    return { grouped, errorMessage: null }
  }

  return { grouped, errorMessage: lastError }
}

export default async function CommitteePage() {
  const { grouped, errorMessage } = await fetchCommitteeMembers()
  const totalMembers = grouped.national.length + grouped.state.length + grouped.district.length
  const stateGroups = groupStateCommittee(grouped.state)
  const districtGroups = groupDistrictCommittee(grouped.district)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">3-Tier Committee System</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          National, State, and District hierarchy sorted by rank.
        </p>
      </div>

      {errorMessage && totalMembers === 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Committee data is not available yet. Configure `committee_members` (or `committees`) table in Supabase.
        </div>
      )}

      <div className="space-y-4">
        {TIER_ORDER.map((tier, index) => {
          const tierMembers = grouped[tier]
          const meta = TIER_META[tier]
          const TierIcon = meta.icon

          return (
            <details
              key={tier}
              open={index === 0}
              className="group overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <summary className="cursor-pointer list-none px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                      <TierIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{meta.title}</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{meta.description}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                    {tierMembers.length}
                  </span>
                </div>
              </summary>

              <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-5">
                {tierMembers.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No members available in this tier.</p>
                ) : tier === 'state' ? (
                  <div className="space-y-4">
                    {stateGroups.map((stateGroup) => (
                      <section
                        key={stateGroup.state}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-bold uppercase tracking-wide text-blue-900 dark:text-blue-200">
                            {stateGroup.state}
                          </h3>
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                            {stateGroup.members.length}
                          </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {stateGroup.members.map((member) => (
                            <article
                              key={member.id}
                              className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                            >
                              <div className="flex items-start gap-3">
                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                  {member.avatar_url ? (
                                    <Image
                                      src={member.avatar_url}
                                      alt={member.name}
                                      fill
                                      sizes="40px"
                                      unoptimized
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-gray-500 dark:text-gray-300">
                                      <User className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{member.name}</h4>
                                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                    {member.designation || 'Committee Member'}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Rank: {member.rank ?? '-'}</p>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : tier === 'district' ? (
                  <div className="space-y-5">
                    {districtGroups.map((stateGroup) => (
                      <section
                        key={stateGroup.state}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
                      >
                        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-blue-900 dark:text-blue-200">
                          {stateGroup.state}
                        </h3>

                        <div className="grid gap-4 md:grid-cols-2">
                          {stateGroup.districts.map((districtGroup) => (
                            <article
                              key={`${stateGroup.state}-${districtGroup.district}`}
                              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{districtGroup.district}</h4>
                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                                  {districtGroup.members.length}
                                </span>
                              </div>

                              <div className="space-y-2">
                                {districtGroup.members.map((member) => (
                                  <div
                                    key={member.id}
                                    className="flex items-center gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                                  >
                                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                      {member.avatar_url ? (
                                        <Image
                                          src={member.avatar_url}
                                          alt={member.name}
                                          fill
                                          sizes="36px"
                                          unoptimized
                                          className="object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-gray-500 dark:text-gray-300">
                                          <User className="h-3.5 w-3.5" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{member.name}</p>
                                      <p className="truncate text-xs text-gray-600 dark:text-gray-300">
                                        {member.designation || 'Committee Member'} | Rank {member.rank ?? '-'}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {tierMembers.map((member) => (
                      <article
                        key={member.id}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            {member.avatar_url ? (
                              <Image
                                src={member.avatar_url}
                                alt={member.name}
                                fill
                                sizes="48px"
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-500 dark:text-gray-300">
                                <User className="h-5 w-5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                              {member.designation || 'Committee Member'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2.5 py-1">
                            <Layers3 className="mr-1 h-3 w-3" />
                            Rank: {member.rank ?? '-'}
                          </span>
                          {tier !== 'national' && member.state && (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 px-2.5 py-1">
                              State: {member.state}
                            </span>
                          )}
                          {tier === 'district' && member.district && (
                            <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 px-2.5 py-1">
                              District: {member.district}
                            </span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
