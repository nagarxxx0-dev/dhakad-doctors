import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Search, UserPlus, Shield, CheckCircle2, Users, UserRound } from 'lucide-react'
import Stories from '@/components/Stories'
import HomeDoctorDirectory from '@/components/HomeDoctorDirectory'
import HomeNationalCommittee from '@/components/HomeNationalCommittee'
import { createClient } from '@/utils/supabase/server'
import { isVerifiedStatusValue } from '@/utils/profile-utils'
import {
  DEFAULT_HOME_CONTENT,
  HOME_CONTENT_KEY,
  parseHomeContentConfig,
  type HomeContentConfig,
} from '@/utils/cms/home-content'

interface HomeSearchParams {
  q?: string
  state?: string
  district?: string
  specialization?: string
  city?: string
}

type TierKey = 'national' | 'state' | 'district'

interface CommitteeHeroMember {
  id: string
  name: string
  designation: string
  avatar_url: string | null
  rank: number | null
}

function cleanParam(value: string | undefined) {
  return value?.trim() || ''
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

function normalizeTier(value: unknown): TierKey | null {
  const tier = readString(value)?.toLowerCase()
  if (!tier) return null
  if (tier.startsWith('nat')) return 'national'
  if (tier.startsWith('sta')) return 'state'
  if (tier.startsWith('dis')) return 'district'
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

function isApprovedRecord(row: Record<string, unknown>) {
  if (row.verified === true) return true
  const status = readString(row.status)
  const approvalStatus = readString(row.approval_status)
  if (status || approvalStatus) {
    return isVerifiedStatusValue(status) || isVerifiedStatusValue(approvalStatus)
  }
  return true
}

function mapHeroCommitteeMembers(rows: Record<string, unknown>[] | null | undefined): CommitteeHeroMember[] {
  return (rows ?? [])
    .map((row, index) => {
      const tier = normalizeTier(row.tier ?? row.level ?? row.committee_tier)
      if (tier !== 'national' || !isApprovedRecord(row)) return null

      return {
        id: readString(row.id) || readString(row.user_id) || `${tier}-${index}`,
        name: readString(row.full_name) || readString(row.name) || readString(row.member_name) || 'Unnamed Member',
        designation:
          readString(row.designation) ||
          readString(row.title) ||
          readString(row.position) ||
          'National Member',
        avatar_url: readString(row.avatar_url) || readString(row.photo_url),
        rank: readRank(row.rank) || readRank(row.position_rank) || readRank(row.committee_rank),
      } satisfies CommitteeHeroMember
    })
    .filter((member): member is CommitteeHeroMember => member !== null)
    .sort((a, b) => {
      const rankA = a.rank ?? Number.MAX_SAFE_INTEGER
      const rankB = b.rank ?? Number.MAX_SAFE_INTEGER
      if (rankA !== rankB) return rankA - rankB
      return a.name.localeCompare(b.name)
    })
}

async function fetchHeroCommitteeMembers(): Promise<CommitteeHeroMember[]> {
  const fallback: CommitteeHeroMember[] = []

  try {
    const supabase = await createClient()
    const tableCandidates = ['committee_members', 'committees']

    for (const table of tableCandidates) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('rank', { ascending: true })
        .limit(12)

      if (error) {
        if (isMissingSchemaError(error.message)) {
          continue
        }
        return fallback
      }

      return mapHeroCommitteeMembers((data as Record<string, unknown>[] | null) ?? []).slice(0, 5)
    }
  } catch {
    return fallback
  }

  return fallback
}

async function fetchHomeContent(): Promise<HomeContentConfig> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cms_settings')
      .select('value')
      .eq('key', HOME_CONTENT_KEY)
      .maybeSingle()

    if (error) {
      return DEFAULT_HOME_CONTENT
    }

    return parseHomeContentConfig((data as { value?: unknown } | null)?.value)
  } catch {
    return DEFAULT_HOME_CONTENT
  }
}

export default async function HomePage(props: { searchParams: Promise<HomeSearchParams> }) {
  const searchParams = await props.searchParams
  const q = cleanParam(searchParams.q)
  const state = cleanParam(searchParams.state)
  const district = cleanParam(searchParams.district)
  const specialization = cleanParam(searchParams.specialization)
  const city = cleanParam(searchParams.city)
  const [committeeMembers, homeContent] = await Promise.all([fetchHeroCommitteeMembers(), fetchHomeContent()])
  const heroInlineStyle = homeContent.hero_background_image_url
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(2, 6, 23, 0.96), rgba(30, 58, 138, 0.88), rgba(8, 145, 178, 0.8)), url(${homeContent.hero_background_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-900 py-16 text-white sm:py-20 lg:py-24"
        style={heroInlineStyle}
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_55%)]" />
        <div className="absolute -right-16 top-10 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -left-12 bottom-8 h-44 w-44 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[2fr,1fr] lg:items-stretch lg:gap-10 lg:px-8">
          <div>
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-100">
              {homeContent.hero_badge}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {homeContent.hero_title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-blue-100 sm:text-base lg:text-lg">
              {homeContent.hero_description}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href={homeContent.primary_cta_href}
                className="inline-flex items-center justify-center rounded-xl border border-transparent bg-white px-7 py-3 text-sm font-semibold text-blue-900 shadow-lg shadow-blue-950/20 transition-colors hover:bg-blue-50 sm:text-base"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                {homeContent.primary_cta_label}
              </Link>
              <Link
                href={homeContent.secondary_cta_href}
                className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:text-base"
              >
                <Search className="w-5 h-5 mr-2" />
                {homeContent.secondary_cta_label}
              </Link>
              <Link
                href={homeContent.committee_cta_href}
                className="inline-flex items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-7 py-3 text-sm font-semibold text-cyan-100 backdrop-blur-sm transition-colors hover:bg-cyan-400/20 sm:text-base"
              >
                <Users className="w-5 h-5 mr-2" />
                {homeContent.committee_cta_label}
              </Link>
            </div>

            <div className="mt-6 grid gap-2 text-sm text-blue-100 sm:grid-cols-2">
              <p className="inline-flex items-center">
                <CheckCircle2 className="mr-2 h-4 w-4 text-cyan-300" />
                {homeContent.feature_point_1}
              </p>
              <p className="inline-flex items-center">
                <CheckCircle2 className="mr-2 h-4 w-4 text-cyan-300" />
                {homeContent.feature_point_2}
              </p>
            </div>
          </div>

          <div className="h-full rounded-3xl border border-cyan-200/30 bg-gradient-to-b from-cyan-400/20 via-blue-900/30 to-blue-950/60 p-5 shadow-lg shadow-blue-950/30 backdrop-blur-md sm:p-6 lg:min-h-[430px]">
            <div className="inline-flex rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-cyan-100">
              {homeContent.national_panel_badge}
            </div>
            <h2 className="mt-3 text-xl font-bold text-white">{homeContent.national_panel_title}</h2>
            <p className="mt-1 text-sm text-blue-100">
              {homeContent.national_panel_description}
            </p>
            {homeContent.national_panel_image_url && (
              <div
                className="mt-4 h-24 w-full overflow-hidden rounded-2xl border border-white/20"
                style={{
                  backgroundImage: `url(${homeContent.national_panel_image_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            )}

            {committeeMembers.length === 0 ? (
              <p className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-blue-100/80">
                {homeContent.national_panel_empty}
              </p>
            ) : (
              <div className="mt-5 space-y-2.5">
                {committeeMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/25 bg-blue-900/70">
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
                        <div className="flex h-full w-full items-center justify-center text-blue-200">
                          <UserRound className="h-4.5 w-4.5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                      <p className="truncate text-xs text-blue-100">{member.designation}</p>
                    </div>
                    <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold text-cyan-100">
                      #{member.rank ?? index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Link
              href={homeContent.national_panel_cta_href}
              className="mt-4 inline-flex items-center rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              {homeContent.national_panel_cta_label}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {[
        {
          key: 'directory',
          show: homeContent.show_directory_section,
          order: homeContent.directory_section_order,
          element: (
            <HomeDoctorDirectory
              q={q}
              state={state}
              district={district}
              specialization={specialization}
              city={city}
            />
          ),
        },
        {
          key: 'national',
          show: homeContent.show_national_committee_section,
          order: homeContent.national_committee_section_order,
          element: <HomeNationalCommittee />,
        },
        {
          key: 'features',
          show: homeContent.show_features_section,
          order: homeContent.features_section_order,
          element: (
            <section className="bg-white py-12 dark:bg-gray-900 sm:py-16">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
                  <h2 className="text-2xl font-bold tracking-tight text-blue-950 dark:text-white sm:text-3xl">
                    Trusted Medical Community Platform
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-gray-400 sm:text-base">
                    Built for verified professionals with clear access control and structured community updates.
                  </p>
                </div>

                <div className="grid gap-4 text-center sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                  <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-blue-950 dark:text-white">Verified Profiles</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                      Connect with verified medical professionals within the Dhakad community.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-blue-950 dark:text-white">Networking</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                      Expand your professional network and collaborate with peers.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:col-span-2 lg:col-span-1">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <ArrowRight className="w-6 h-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-blue-950 dark:text-white">Growth</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                      Access resources, share success stories, and grow together.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          ),
        },
        {
          key: 'stories',
          show: homeContent.show_stories_section,
          order: homeContent.stories_section_order,
          element: <Stories />,
        },
      ]
        .filter((section) => section.show)
        .sort((a, b) => {
          if (a.order !== b.order) return a.order - b.order
          return a.key.localeCompare(b.key)
        })
        .map((section) => (
          <div key={section.key}>{section.element}</div>
        ))}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <span className="text-2xl font-bold text-white">Dhakad Doctors</span>
            <p className="text-sm mt-1 text-gray-400">Empowering the medical community.</p>
          </div>
          <div className="flex space-x-8">
            <Link href="/directory" className="hover:text-white transition-colors">Directory</Link>
            <Link href="/committee" className="hover:text-white transition-colors">Committee</Link>
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Join</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-gray-800 text-sm text-center text-gray-500">
          &copy; {new Date().getFullYear()} Dhakad Doctors. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
