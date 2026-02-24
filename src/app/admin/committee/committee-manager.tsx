'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AlertTriangle, Edit2, FileUp, Loader2, Save, Trash2, User, X } from 'lucide-react'
import { getAllStates, getDistricts } from 'india-state-district'
import { deleteCommitteeMember, importCommitteeMembersCsv, upsertCommitteeMember } from './actions'

type TierKey = 'national' | 'state' | 'district'

interface CommitteeMember {
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

interface ApprovedProfileOption {
  id: string
  full_name: string
  role: string | null
  state: string | null
  district: string | null
  avatar_url: string | null
}

interface FormState {
  id: string
  profile_id: string
  designation: string
  tier: TierKey
  state: string
  district: string
  rank: string
}

const initialForm: FormState = {
  id: '',
  profile_id: '',
  designation: '',
  tier: 'national',
  state: '',
  district: '',
  rank: '1',
}

export default function CommitteeManager({
  initialMembers,
  approvedProfiles,
}: {
  initialMembers: CommitteeMember[]
  approvedProfiles: ApprovedProfileOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [members, setMembers] = useState<CommitteeMember[]>(initialMembers)
  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvInputKey, setCsvInputKey] = useState(0)

  useEffect(() => {
    setMembers(initialMembers)
  }, [initialMembers])

  const grouped = useMemo(() => {
    const groups: Record<TierKey, CommitteeMember[]> = {
      national: [],
      state: [],
      district: [],
    }

    for (const member of members) {
      groups[member.tier].push(member)
    }

    for (const tier of Object.keys(groups) as TierKey[]) {
      groups[tier].sort((a, b) => {
        const ar = a.rank ?? Number.MAX_SAFE_INTEGER
        const br = b.rank ?? Number.MAX_SAFE_INTEGER
        if (ar !== br) return ar - br
        return a.full_name.localeCompare(b.full_name)
      })
    }

    return groups
  }, [members])

  const sortedApprovedProfiles = useMemo(() => {
    return [...approvedProfiles].sort((a, b) => a.full_name.localeCompare(b.full_name))
  }, [approvedProfiles])

  const approvedProfilesMap = useMemo(() => {
    const map = new Map<string, ApprovedProfileOption>()
    for (const profile of sortedApprovedProfiles) {
      map.set(profile.id, profile)
    }
    return map
  }, [sortedApprovedProfiles])

  const selectedProfile = useMemo(() => {
    if (!form.profile_id) return null
    return approvedProfilesMap.get(form.profile_id) || null
  }, [approvedProfilesMap, form.profile_id])

  const stateOptions = useMemo(() => {
    return getAllStates().sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const selectedStateCode = useMemo(() => {
    if (!form.state) return null
    const directMatch = stateOptions.find((state) => state.name === form.state)
    if (directMatch) return directMatch.code
    const normalized = form.state.toLowerCase()
    return stateOptions.find((state) => state.name.toLowerCase() === normalized)?.code || null
  }, [form.state, stateOptions])

  const districtOptions = useMemo(() => {
    if (!selectedStateCode) return []
    return [...getDistricts(selectedStateCode)].sort((a, b) => a.localeCompare(b))
  }, [selectedStateCode])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleEdit(member: CommitteeMember) {
    setForm({
      id: member.id,
      profile_id: member.user_id || '',
      designation: member.designation || '',
      tier: member.tier,
      state: member.state || '',
      district: member.district || '',
      rank: String(member.rank || 1),
    })
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancel() {
    setForm(initialForm)
    setMessage(null)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    if (!form.profile_id) {
      setMessage({ type: 'error', text: 'Please select an approved profile to link.' })
      return
    }

    const formData = new FormData()
    if (form.id) formData.append('id', form.id)
    formData.append('profile_id', form.profile_id)
    formData.append('designation', form.designation)
    formData.append('tier', form.tier)
    if (form.state) formData.append('state', form.state)
    if (form.district) formData.append('district', form.district)
    formData.append('rank', form.rank)

    startTransition(async () => {
      const result = await upsertCommitteeMember(formData)

      if (result?.error) {
        const errorText =
          typeof result.error === 'string'
            ? result.error
            : Object.values(result.error)[0]?.[0] || 'Unable to save committee member'
        setMessage({ type: 'error', text: errorText })
        return
      }

      setMessage({ type: 'success', text: 'Committee member saved successfully' })
      setForm(initialForm)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this committee member?')) return

    startTransition(async () => {
      const result = await deleteCommitteeMember(id)

      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
        return
      }

      setMessage({ type: 'success', text: 'Committee member deleted successfully' })
      router.refresh()
    })
  }

  function handleCsvImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    if (!csvFile) {
      setMessage({ type: 'error', text: 'Please choose a CSV file before importing.' })
      return
    }

    const formData = new FormData()
    formData.append('file', csvFile)

    startTransition(async () => {
      const result = await importCommitteeMembersCsv(formData)

      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
        router.refresh()
        return
      }

      setMessage({ type: 'success', text: result?.success || 'CSV imported successfully' })
      setCsvFile(null)
      setCsvInputKey((value) => value + 1)
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleCsvImport}
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Bulk Import (CSV)</h2>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
            Import CSV
          </button>
        </div>

        <input
          key={csvInputKey}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700"
        />

        <div className="rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-600 dark:text-gray-300">
          <p className="font-semibold mb-1">CSV headers (recommended):</p>
          <code className="block whitespace-pre-wrap">
            full_name,designation,tier,state,district,rank,avatar_url
          </code>
          <p className="mt-2">`tier` values: national | state | district</p>
          <p>`id` column add karoge to existing row update hoga, warna new row insert hoga.</p>
        </div>
      </form>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {form.id ? 'Edit Committee Member' : 'Add Committee Member'}
          </h2>
          {form.id && (
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <X className="mr-1 h-4 w-4" />
              Cancel
            </button>
          )}
        </div>

        {message && (
          <div
            className={`rounded-md border px-3 py-2 text-sm ${
              message.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Link Approved Profile
            </label>
            <select
              value={form.profile_id}
              onChange={(e) => {
                const profileId = e.target.value
                if (!profileId) {
                  setForm((prev) => ({ ...prev, profile_id: '' }))
                  return
                }

                const profile = approvedProfilesMap.get(profileId)
                setForm((prev) => ({
                  ...prev,
                  profile_id: profileId,
                  designation: prev.designation || (profile?.role ? `${profile.role} Representative` : ''),
                  state: prev.state || profile?.state || '',
                  district: prev.district || profile?.district || '',
                }))
              }}
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
            >
              <option value="">Select approved profile</option>
              {sortedApprovedProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name}
                  {profile.role ? ` - ${profile.role}` : ''}
                  {profile.state ? ` (${profile.state})` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Committee member only approved profiles se link hoga. Name/photo/location profile se auto-load hota hai.
            </p>
          </div>

          {selectedProfile ? (
            <div className="md:col-span-2 rounded-md border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-900/20">
              <div className="flex items-start gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-blue-100 bg-white dark:border-gray-700 dark:bg-gray-800">
                  {selectedProfile.avatar_url ? (
                    <Image
                      src={selectedProfile.avatar_url}
                      alt={selectedProfile.full_name}
                      fill
                      sizes="48px"
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-blue-700 dark:text-blue-200">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-blue-900 dark:text-blue-100">{selectedProfile.full_name}</p>
                  <p className="mt-1 text-xs text-blue-700 dark:text-blue-200">
                    Role: {selectedProfile.role || 'member'}
                    {selectedProfile.state ? ` | ${selectedProfile.state}` : ''}
                    {selectedProfile.district ? ` | ${selectedProfile.district}` : ''}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Designation</label>
            <input
              type="text"
              value={form.designation}
              onChange={(e) => setField('designation', e.target.value)}
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
              placeholder="President / Secretary / Member"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tier</label>
            <select
              value={form.tier}
              onChange={(e) => {
                const tier = e.target.value as TierKey
                setForm((prev) => ({
                  ...prev,
                  tier,
                  state: tier === 'national' ? '' : prev.state,
                  district: tier === 'district' ? prev.district : '',
                }))
              }}
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
            >
              <option value="national">National</option>
              <option value="state">State</option>
              <option value="district">District</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rank</label>
            <input
              type="number"
              min={1}
              value={form.rank}
              onChange={(e) => setField('rank', e.target.value)}
              required
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
            />
          </div>

          {form.tier !== 'national' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
              <select
                value={form.state}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    state: e.target.value,
                    district: '',
                  }))
                }
                required
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
              >
                <option value="">Select State</option>
                {stateOptions.map((state) => (
                  <option key={state.code} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.tier === 'district' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">District</label>
              <select
                value={form.district}
                onChange={(e) => setField('district', e.target.value)}
                required
                disabled={!form.state}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
              >
                <option value="">{form.state ? 'Select District' : 'Select state first'}</option>
                {districtOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.tier === 'district' && form.state && districtOptions.length === 0 && (
            <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
              <p className="inline-flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                District list load nahi hui. State selection check karein.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {form.id ? 'Update Member' : 'Add Member'}
          </button>
        </div>
      </form>

      <div className="space-y-6">
        {(['national', 'state', 'district'] as TierKey[]).map((tier) => (
          <section
            key={tier}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize mb-4">
              {tier} Committee ({grouped[tier].length})
            </h3>

            {grouped[tier].length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No members in this tier.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[tier].map((member) => (
                  <article
                    key={member.id}
                    className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                        {member.avatar_url ? (
                          <Image
                            src={member.avatar_url}
                            alt={member.full_name}
                            fill
                            sizes="40px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-500">
                            {member.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">{member.full_name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {member.designation || 'Committee Member'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Rank: {member.rank ?? '-'}
                          {member.state ? ` | ${member.state}` : ''}
                          {member.district ? ` | ${member.district}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(member)}
                        className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <Edit2 className="mr-1 h-3 w-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(member.id)}
                        className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
