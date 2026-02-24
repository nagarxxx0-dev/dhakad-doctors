export type AppRole = 'guest' | 'public' | 'doctor' | 'student' | 'admin'

export function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function normalizeRole(value: unknown): AppRole {
  const role = readString(value)?.trim().toLowerCase()
  if (role === 'admin') return 'admin'
  if (role === 'doctor') return 'doctor'
  if (role === 'student') return 'student'
  if (role === 'guest') return 'guest'
  return 'public'
}

export function isVerifiedStatusValue(value: unknown): boolean {
  const normalized = readString(value)?.trim().toLowerCase()
  return normalized === 'approved' || normalized === 'verified'
}

export function isProfileVerified(profile: Record<string, unknown> | null | undefined): boolean {
  if (!profile) return false
  if (normalizeRole(profile.role) === 'admin') return true
  if (profile.verified === true) return true
  return isVerifiedStatusValue(profile.approval_status) || isVerifiedStatusValue(profile.status)
}
