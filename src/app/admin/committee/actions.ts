'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { isVerifiedStatusValue } from '@/utils/profile-utils'

type TierKey = 'national' | 'state' | 'district'
type CommitteeTable = 'committee_members' | 'committees'
type SupabaseClientType = Awaited<ReturnType<typeof createClient>>

export interface CommitteeMember {
  id: string
  user_id: string | null
  full_name: string
  designation: string | null
  tier: TierKey
  state: string | null
  district: string | null
  rank: number | null
  avatar_url: string | null
}

interface CommitteeInput {
  user_id: string | null
  full_name: string
  designation: string | null
  tier: TierKey
  state: string | null
  district: string | null
  rank: number
  avatar_url: string | null
}

export interface ApprovedProfileOption {
  id: string
  full_name: string
  role: string | null
  state: string | null
  district: string | null
  avatar_url: string | null
}

const COMMITTEE_TABLES: CommitteeTable[] = ['committee_members', 'committees']

const committeeSchema = z.object({
  id: z.string().optional(),
  profile_id: z.string().optional(),
  full_name: z.string().min(3, 'Full name must be at least 3 characters'),
  designation: z.string().optional(),
  tier: z.enum(['national', 'state', 'district']),
  state: z.string().optional(),
  district: z.string().optional(),
  rank: z.coerce.number().int().min(1, 'Rank must be at least 1'),
  avatar_url: z.string().optional(),
})

const committeeManagerSchema = z.object({
  id: z.string().optional(),
  profile_id: z.string().min(1, 'Please select an approved profile'),
  designation: z.string().optional(),
  tier: z.enum(['national', 'state', 'district']),
  state: z.string().optional(),
  district: z.string().optional(),
  rank: z.coerce.number().int().min(1, 'Rank must be at least 1'),
})

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

function readBoolean(value: unknown): boolean {
  return value === true
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
  const mapped = (rows ?? [])
    .map((row, index) => {
      const tier = normalizeTier(readString(row.tier) || readString(row.level) || readString(row.committee_tier))
      if (!tier) return null

      const id = readString(row.id) || readString(row.user_id) || `${tier}-${index}`

      return {
        id,
        user_id: readString(row.user_id),
        full_name:
          readString(row.full_name) || readString(row.name) || readString(row.member_name) || 'Unnamed Member',
        designation:
          readString(row.designation) || readString(row.title) || readString(row.position) || readString(row.role),
        tier,
        state: readString(row.state),
        district: readString(row.district),
        rank: readRank(row.rank) || readRank(row.position_rank) || readRank(row.committee_rank),
        avatar_url: readString(row.avatar_url) || readString(row.photo_url),
      } satisfies CommitteeMember
    })
    .filter((item): item is CommitteeMember => item !== null)

  mapped.sort((a, b) => {
    const tierScore = { national: 1, state: 2, district: 3 }
    const tierDiff = tierScore[a.tier] - tierScore[b.tier]
    if (tierDiff !== 0) return tierDiff

    const ar = a.rank ?? Number.MAX_SAFE_INTEGER
    const br = b.rank ?? Number.MAX_SAFE_INTEGER
    if (ar !== br) return ar - br

    return a.full_name.localeCompare(b.full_name)
  })

  return mapped
}

async function verifyAdmin(supabase: SupabaseClientType) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return { ok: false, error: 'Admin access required' }
  }

  return { ok: true }
}

async function resolveCommitteeTable(supabase: SupabaseClientType) {
  let lastError: string | null = null

  for (const table of COMMITTEE_TABLES) {
    const { error } = await supabase.from(table).select('id').limit(1)

    if (!error) {
      return { table, error: null }
    }

    if (isMissingSchemaError(error.message)) {
      lastError = error.message
      continue
    }

    return { table: null, error: error.message }
  }

  return { table: null, error: lastError || 'Committee table not found' }
}

function normalizeTierLocation(input: { tier: TierKey; state: string | null; district: string | null }) {
  let { state, district } = input

  if (input.tier === 'national') {
    state = null
    district = null
  }

  if (input.tier === 'state') {
    if (!state) {
      return { error: 'State is required for state-level committee members' }
    }
    district = null
  }

  if (input.tier === 'district') {
    if (!state) {
      return { error: 'State is required for district-level committee members' }
    }
    if (!district) {
      return { error: 'District is required for district-level committee members' }
    }
  }

  return { state, district }
}

function buildPayloadCombos(input: {
  user_id: string | null
  full_name: string
  designation: string | null
  tier: TierKey
  state: string | null
  district: string | null
  rank: number
  avatar_url: string | null
  nowIso: string
  includeCreatedAt: boolean
}) {
  const designationVariants: Array<Record<string, string | null>> = input.designation
    ? [{ designation: input.designation }, { title: input.designation }, { position: input.designation }, {}]
    : [{}]

  const avatarVariants: Array<Record<string, string | null>> = input.avatar_url
    ? [{ avatar_url: input.avatar_url }, { photo_url: input.avatar_url }, {}]
    : [{}]

  const approvalVariants: Array<Record<string, string>> = [
    { status: 'approved', approval_status: 'approved' },
    { status: 'approved' },
    { approval_status: 'approved' },
    {},
  ]

  const userIdVariants: Array<Record<string, string | null>> = input.user_id
    ? [{ user_id: input.user_id }, {}]
    : [{}]

  const basePayload: Record<string, string | number | null> = {
    full_name: input.full_name,
    tier: input.tier,
    state: input.state,
    district: input.district,
    rank: input.rank,
    updated_at: input.nowIso,
  }

  if (input.includeCreatedAt) {
    basePayload.created_at = input.nowIso
  }

  const payloads: Array<Record<string, string | number | null>> = []

  for (const designationVariant of designationVariants) {
    for (const avatarVariant of avatarVariants) {
      for (const approvalVariant of approvalVariants) {
        for (const userIdVariant of userIdVariants) {
          payloads.push({
            ...basePayload,
            ...designationVariant,
            ...avatarVariant,
            ...approvalVariant,
            ...userIdVariant,
          })
        }
      }
    }
  }

  return payloads
}

async function saveCommitteeMember(params: {
  supabase: SupabaseClientType
  table: CommitteeTable
  id?: string
  input: CommitteeInput
}) {
  const nowIso = new Date().toISOString()
  const payloads = buildPayloadCombos({
    ...params.input,
    nowIso,
    includeCreatedAt: !params.id,
  })

  for (const payload of payloads) {
    let errorMessage: string | null = null

    if (params.id) {
      const { error } = await params.supabase.from(params.table).update(payload).eq('id', params.id)
      errorMessage = error?.message ?? null
    } else {
      const { error } = await params.supabase.from(params.table).insert(payload)
      errorMessage = error?.message ?? null
    }

    if (!errorMessage) {
      return { ok: true as const }
    }

    if (!isMissingSchemaError(errorMessage)) {
      return { ok: false as const, error: errorMessage }
    }
  }

  return {
    ok: false as const,
    error: 'Unable to save member. Please verify committee table columns.',
  }
}

function parseCsvRows(csvText: string) {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  const text = `${csvText}\n`

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++
      }
      currentRow.push(currentCell)
      currentCell = ''

      if (currentRow.some((cell) => cell.trim() !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
      continue
    }

    currentCell += char
  }

  return rows
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

function pickValue(record: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = record[alias]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

function mapBulkRowToRaw(record: Record<string, string>) {
  return {
    id: pickValue(record, ['id', 'member_id']),
    profile_id: pickValue(record, ['profile_id', 'user_id']),
    full_name: pickValue(record, ['full_name', 'name', 'member_name']),
    designation: pickValue(record, ['designation', 'title', 'position', 'role']),
    tier: normalizeTier(pickValue(record, ['tier', 'level', 'committee_tier']) || null) || undefined,
    state: pickValue(record, ['state']),
    district: pickValue(record, ['district']),
    rank: pickValue(record, ['rank', 'position_rank', 'committee_rank']),
    avatar_url: pickValue(record, ['avatar_url', 'photo_url']),
  }
}

export async function getCommitteeMembers() {
  const supabase = await createClient()
  const adminCheck = await verifyAdmin(supabase)
  if (!adminCheck.ok) {
    return { members: [] as CommitteeMember[], error: adminCheck.error }
  }

  const { table, error: tableError } = await resolveCommitteeTable(supabase)
  if (!table) {
    return { members: [] as CommitteeMember[], error: tableError || 'Committee table not found' }
  }

  let { data, error } = await supabase.from(table).select('*').order('rank', { ascending: true })

  if (error && isMissingSchemaError(error.message)) {
    const fallbackResult = await supabase.from(table).select('*')
    data = fallbackResult.data
    error = fallbackResult.error
  }

  if (error) {
    return { members: [] as CommitteeMember[], error: error.message }
  }

  return { members: mapCommitteeRows((data as Record<string, unknown>[] | null) ?? []), error: null }
}

function mapApprovedProfiles(rows: Record<string, unknown>[] | null | undefined): ApprovedProfileOption[] {
  return (rows ?? [])
    .map((row) => {
      const id = readString(row.id)
      const full_name = readString(row.full_name)
      if (!id || !full_name) return null

      return {
        id,
        full_name,
        role: readString(row.role),
        state: readString(row.state),
        district: readString(row.district),
        avatar_url: readString(row.avatar_url),
      } satisfies ApprovedProfileOption
    })
    .filter((profile): profile is ApprovedProfileOption => profile !== null)
}

export async function getApprovedProfilesForCommittee() {
  const supabase = await createClient()
  const adminCheck = await verifyAdmin(supabase)
  if (!adminCheck.ok) {
    return { profiles: [] as ApprovedProfileOption[], error: adminCheck.error }
  }

  const approvalModes = ['both', 'status', 'approval_status', 'verified'] as const
  let lastError: string | null = null

  for (const mode of approvalModes) {
    let query = supabase.from('profiles').select('*').order('full_name', { ascending: true })

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

    if (error) {
      if (isMissingSchemaError(error.message)) {
        lastError = error.message
        continue
      }
      return { profiles: [] as ApprovedProfileOption[], error: error.message }
    }

    const mapped = mapApprovedProfiles((data as Record<string, unknown>[] | null) ?? [])
    const nonAdmin = mapped.filter((profile) => profile.role?.toLowerCase() !== 'admin')

    return { profiles: nonAdmin, error: null }
  }

  return { profiles: [] as ApprovedProfileOption[], error: lastError || 'Unable to load approved profiles' }
}

async function resolveApprovedProfileForCommittee(params: {
  supabase: SupabaseClientType
  profileId: string
}) {
  const { supabase, profileId } = params
  const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId).maybeSingle()

  if (error) {
    return { profile: null as ApprovedProfileOption | null, error: error.message }
  }

  const row = (data as Record<string, unknown> | null) ?? null
  if (!row) {
    return { profile: null as ApprovedProfileOption | null, error: 'Selected profile not found' }
  }

  const role = readString(row.role)
  if (role?.toLowerCase() === 'admin') {
    return { profile: null as ApprovedProfileOption | null, error: 'Admin profile cannot be linked as committee member' }
  }

  const isApproved =
    readBoolean(row.verified) || isVerifiedStatusValue(row.status) || isVerifiedStatusValue(row.approval_status)
  if (!isApproved) {
    return { profile: null as ApprovedProfileOption | null, error: 'Profile is not approved yet' }
  }

  const fullName = readString(row.full_name)
  if (!fullName) {
    return { profile: null as ApprovedProfileOption | null, error: 'Profile full name is missing' }
  }

  return {
    profile: {
      id: readString(row.id) || '',
      full_name: fullName,
      role,
      state: readString(row.state),
      district: readString(row.district),
      avatar_url: readString(row.avatar_url),
    } satisfies ApprovedProfileOption,
    error: null as string | null,
  }
}

export async function upsertCommitteeMember(formData: FormData) {
  const supabase = await createClient()
  const adminCheck = await verifyAdmin(supabase)
  if (!adminCheck.ok) {
    return { error: adminCheck.error }
  }

  const { table, error: tableError } = await resolveCommitteeTable(supabase)
  if (!table) {
    return { error: tableError || 'Committee table not found' }
  }

  const rawData = {
    id: formData.get('id')?.toString() || undefined,
    profile_id: formData.get('profile_id')?.toString() || '',
    designation: formData.get('designation')?.toString(),
    tier: formData.get('tier')?.toString(),
    state: formData.get('state')?.toString(),
    district: formData.get('district')?.toString(),
    rank: formData.get('rank')?.toString(),
  }

  const validated = committeeManagerSchema.safeParse(rawData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const linkedProfile = await resolveApprovedProfileForCommittee({
    supabase,
    profileId: validated.data.profile_id,
  })

  if (linkedProfile.error || !linkedProfile.profile) {
    return { error: linkedProfile.error || 'Unable to load selected profile' }
  }

  const normalizedLocation = normalizeTierLocation({
    tier: validated.data.tier,
    state: readString(validated.data.state) || linkedProfile.profile.state,
    district: readString(validated.data.district) || linkedProfile.profile.district,
  })

  if ('error' in normalizedLocation) {
    return { error: `${normalizedLocation.error}. Update location in selected profile first.` }
  }

  const saveResult = await saveCommitteeMember({
    supabase,
    table,
    id: validated.data.id,
    input: {
      user_id: linkedProfile.profile.id,
      full_name: linkedProfile.profile.full_name,
      designation: readString(validated.data.designation),
      tier: validated.data.tier,
      state: normalizedLocation.state,
      district: normalizedLocation.district,
      rank: validated.data.rank,
      avatar_url: linkedProfile.profile.avatar_url,
    },
  })

  if (!saveResult.ok) {
    return { error: saveResult.error }
  }

  revalidatePath('/admin/committee')
  revalidatePath('/committee')
  return { success: 'Committee member saved successfully' }
}

export async function importCommitteeMembersCsv(formData: FormData) {
  const supabase = await createClient()
  const adminCheck = await verifyAdmin(supabase)
  if (!adminCheck.ok) {
    return { error: adminCheck.error }
  }

  const { table, error: tableError } = await resolveCommitteeTable(supabase)
  if (!table) {
    return { error: tableError || 'Committee table not found' }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Please upload a valid CSV file' }
  }

  const csvText = await file.text()
  const parsedRows = parseCsvRows(csvText)

  if (parsedRows.length < 2) {
    return { error: 'CSV must include a header row and at least one data row' }
  }

  const headers = parsedRows[0].map(normalizeHeader)
  const dataRows = parsedRows.slice(1)

  let successCount = 0
  const failures: string[] = []

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const rowValues = dataRows[rowIndex]
    const rowNumber = rowIndex + 2
    const record: Record<string, string> = {}

    headers.forEach((header, colIndex) => {
      record[header] = (rowValues[colIndex] || '').trim()
    })

    if (Object.values(record).every((value) => !value)) {
      continue
    }

    const mappedRaw = mapBulkRowToRaw(record)
    const validated = committeeSchema.safeParse(mappedRaw)

    if (!validated.success) {
      const firstIssue = validated.error.issues[0]
      failures.push(`Row ${rowNumber}: ${firstIssue?.message || 'Invalid row data'}`)
      continue
    }

    const normalizedLocation = normalizeTierLocation({
      tier: validated.data.tier,
      state: readString(validated.data.state),
      district: readString(validated.data.district),
    })

    if ('error' in normalizedLocation) {
      failures.push(`Row ${rowNumber}: ${normalizedLocation.error}`)
      continue
    }

    const saveResult = await saveCommitteeMember({
      supabase,
      table,
      id: validated.data.id,
      input: {
        user_id: readString(validated.data.profile_id),
        full_name: validated.data.full_name,
        designation: readString(validated.data.designation),
        tier: validated.data.tier,
        state: normalizedLocation.state,
        district: normalizedLocation.district,
        rank: validated.data.rank,
        avatar_url: readString(validated.data.avatar_url),
      },
    })

    if (!saveResult.ok) {
      failures.push(`Row ${rowNumber}: ${saveResult.error}`)
      continue
    }

    successCount++
  }

  if (successCount > 0) {
    revalidatePath('/admin/committee')
    revalidatePath('/committee')
  }

  if (failures.length > 0) {
    return {
      error:
        `Imported ${successCount} rows, failed ${failures.length}. ` +
        failures.slice(0, 5).join(' | '),
    }
  }

  return { success: `Successfully imported ${successCount} committee members` }
}

export async function deleteCommitteeMember(id: string) {
  const supabase = await createClient()
  const adminCheck = await verifyAdmin(supabase)
  if (!adminCheck.ok) {
    return { error: adminCheck.error }
  }

  const { table, error: tableError } = await resolveCommitteeTable(supabase)
  if (!table) {
    return { error: tableError || 'Committee table not found' }
  }

  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/committee')
  revalidatePath('/committee')
  return { success: 'Committee member deleted successfully' }
}
