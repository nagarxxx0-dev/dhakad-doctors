import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Crown, MapPin, UserRound } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { isVerifiedStatusValue } from '@/utils/profile-utils'

interface NationalMember {
  id: string
  full_name: string
  designation: string | null
  state: string | null
  rank: number | null
  avatar_url: string | null
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function readRank(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeTier(value: unknown) {
  const tier = readString(value)?.toLowerCase()
  if (!tier) return null
  if (tier.startsWith('nat')) return 'national'
  if (tier.startsWith('sta')) return 'state'
  if (tier.startsWith('dis')) return 'district'
  return null
}

function mapCommitteeRows(rows: Record<string, unknown>[] | null | undefined): NationalMember[] {
  return (rows ?? [])
    .map((row, index) => {
      const tier = normalizeTier(row.tier ?? row.level ?? row.committee_tier)
      if (tier !== 'national') return null

      const status = readString(row.status)
      const approvalStatus = readString(row.approval_status)
      if (status && !isVerifiedStatusValue(status) && approvalStatus && !isVerifiedStatusValue(approvalStatus)) {
        return null
      }

      return {
        id: readString(row.id) || `national-${index}`,
        full_name: readString(row.full_name) || readString(row.name) || 'Unnamed Member',
        designation:
          readString(row.designation) || readString(row.title) || readString(row.position) || 'National Member',
        state: readString(row.state),
        rank: readRank(row.rank) || readRank(row.position_rank) || readRank(row.committee_rank),
        avatar_url: readString(row.avatar_url) || readString(row.photo_url),
      } satisfies NationalMember
    })
    .filter((member): member is NationalMember => member !== null)
}

function mapProfileRows(rows: Record<string, unknown>[] | null | undefined): NationalMember[] {
  return (rows ?? [])
    .map((row) => {
      const id = readString(row.id)
      const full_name = readString(row.full_name)
      if (!id || !full_name) return null

      return {
        id,
        full_name,
        designation: readString(row.specialization) || 'National Advisor',
        state: readString(row.state),
        rank: null,
        avatar_url: readString(row.avatar_url),
      } satisfies NationalMember
    })
    .filter((member): member is NationalMember => member !== null)
}

function isMissingSchemaError(errorMessage: string | undefined) {
  if (!errorMessage) return false
  return errorMessage.includes('does not exist') || errorMessage.includes('column') || errorMessage.includes('relation')
}

async function fetchNationalMembers() {
  const supabase = await createClient()
  const tableCandidates = ['committee_members', 'committees']

  for (const table of tableCandidates) {
    const { data, error } = await supabase.from(table).select('*').order('rank', { ascending: true }).limit(20)
    if (error) {
      if (isMissingSchemaError(error.message)) {
        continue
      }
      break
    }

    const mapped = mapCommitteeRows((data as Record<string, unknown>[] | null) ?? []).sort((a, b) => {
      const ar = a.rank ?? Number.MAX_SAFE_INTEGER
      const br = b.rank ?? Number.MAX_SAFE_INTEGER
      if (ar !== br) return ar - br
      return a.full_name.localeCompare(b.full_name)
    })

    if (mapped.length > 0) {
      return mapped.slice(0, 6)
    }
  }

  const approvalModes = ['both', 'status', 'approval_status', 'verified'] as const
  for (const mode of approvalModes) {
    let query = supabase
      .from('profiles')
      .select('*')
      .ilike('role', '%doctor%')
      .order('full_name', { ascending: true })
      .limit(6)

    if (mode === 'both') {
      query = query.or('status.in.(approved,verified),approval_status.in.(approved,verified),verified.eq.true')
    } else if (mode === 'status') {
      query = query.in('status', ['approved', 'verified'])
    } else if (mode === 'approval_status') {
      query = query.in('approval_status', ['approved', 'verified'])
    } else {
      query = query.eq('verified', true)
    }

    const { data, error } = await query
    if (!error) {
      const mapped = mapProfileRows((data as Record<string, unknown>[] | null) ?? [])
      if (mapped.length > 0) return mapped
    } else if (!isMissingSchemaError(error.message)) {
      break
    }
  }

  return []
}

export default async function HomeNationalCommittee() {
  const members = await fetchNationalMembers()

  if (members.length === 0) {
    return null
  }

  return (
    <section className="bg-gradient-to-b from-blue-950 to-blue-900 py-12 text-blue-50 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-100">
              Leadership
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">National Committee</h2>
            <p className="mt-2 text-sm text-blue-100 sm:text-base">Core national leadership members.</p>
          </div>
          <Link
            href="/committee"
            className="inline-flex items-center rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            View Full Committee
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member, index) => (
            <article
              key={member.id}
              className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-sm backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-blue-900/60">
                  {member.avatar_url ? (
                    <Image
                      src={member.avatar_url}
                      alt={member.full_name}
                      fill
                      sizes="56px"
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-blue-200">
                      <UserRound className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold">{member.full_name}</h3>
                  <p className="mt-1 text-xs uppercase tracking-wide text-blue-200">
                    {member.designation || 'National Member'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center rounded-full bg-blue-800/70 px-2.5 py-1 font-semibold text-blue-100">
                  <Crown className="mr-1 h-3.5 w-3.5" />
                  Rank {member.rank || index + 1}
                </span>
                {member.state && (
                  <span className="inline-flex items-center rounded-full bg-cyan-800/60 px-2.5 py-1 font-semibold text-cyan-100">
                    <MapPin className="mr-1 h-3.5 w-3.5" />
                    {member.state}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
