export const HOME_CONTENT_KEY = 'home_hero'

export type HomeHeroButtonStyle = 'primary' | 'secondary' | 'accent'

export interface HomeHeroButton {
  id: string
  label: string
  href: string
  style: HomeHeroButtonStyle
}

export interface HomeContentConfig {
  hero_badge: string
  hero_title: string
  hero_description: string
  hero_background_image_url: string
  hero_buttons: HomeHeroButton[]
  primary_cta_label: string
  primary_cta_href: string
  secondary_cta_label: string
  secondary_cta_href: string
  committee_cta_label: string
  committee_cta_href: string
  feature_point_1: string
  feature_point_2: string
  national_panel_badge: string
  national_panel_title: string
  national_panel_description: string
  national_panel_image_url: string
  national_panel_empty: string
  national_panel_cta_label: string
  national_panel_cta_href: string
  show_directory_section: boolean
  show_national_committee_section: boolean
  show_features_section: boolean
  show_stories_section: boolean
  directory_section_order: number
  national_committee_section_order: number
  features_section_order: number
  stories_section_order: number
}

export const DEFAULT_HOME_CONTENT: HomeContentConfig = {
  hero_badge: 'Medical Community Platform',
  hero_title: 'Welcome to Dhakad Doctors Community',
  hero_description:
    'A trusted digital network for doctors, students, and verified members with structured approvals, searchable directory, and committee leadership access.',
  hero_background_image_url: '',
  hero_buttons: [
    { id: 'join-community', label: 'Join Community', href: '/signup', style: 'primary' },
    { id: 'find-doctors', label: 'Find Doctors', href: '/directory', style: 'secondary' },
    { id: 'view-committee', label: 'View Committee', href: '/committee', style: 'accent' },
  ],
  primary_cta_label: 'Join Community',
  primary_cta_href: '/signup',
  secondary_cta_label: 'Find Doctors',
  secondary_cta_href: '/directory',
  committee_cta_label: 'View Committee',
  committee_cta_href: '/committee',
  feature_point_1: 'Verification-based access',
  feature_point_2: 'Fast medical directory',
  national_panel_badge: 'National Committee',
  national_panel_title: 'Leadership Profiles',
  national_panel_description: 'National level committee members shown in rank order.',
  national_panel_image_url: '',
  national_panel_empty: 'No national committee members added yet.',
  national_panel_cta_label: 'View Full Committee',
  national_panel_cta_href: '/committee',
  show_directory_section: true,
  show_national_committee_section: true,
  show_features_section: true,
  show_stories_section: true,
  directory_section_order: 1,
  national_committee_section_order: 2,
  features_section_order: 3,
  stories_section_order: 4,
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null
}

function normalizeHeroButtonStyle(value: unknown): HomeHeroButtonStyle {
  const style = readString(value)?.toLowerCase()
  if (style === 'primary' || style === 'secondary' || style === 'accent') {
    return style
  }
  return 'secondary'
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
  }

  return null
}

function readWithFallback(
  source: Record<string, unknown> | null,
  key: keyof HomeContentConfig,
  fallback: string
) {
  return readString(source?.[key]) || fallback
}

function parseHeroButtons(source: Record<string, unknown> | null): HomeHeroButton[] {
  const rawButtons = source?.hero_buttons
  if (Array.isArray(rawButtons)) {
    const parsed = rawButtons
      .map((button, index) => {
        if (!button || typeof button !== 'object' || Array.isArray(button)) return null
        const record = button as Record<string, unknown>
        const label = readString(record.label)
        const href = readString(record.href)
        if (!label || !href) return null

        return {
          id: readString(record.id) || `hero-btn-${index + 1}`,
          label,
          href,
          style: normalizeHeroButtonStyle(record.style),
        } satisfies HomeHeroButton
      })
      .filter((button): button is HomeHeroButton => button !== null)
      .slice(0, 6)

    if (parsed.length > 0) {
      return parsed
    }
  }

  const fallbackFromLegacy = [
    {
      id: 'join-community',
      label: readString(source?.primary_cta_label) || DEFAULT_HOME_CONTENT.primary_cta_label,
      href: readString(source?.primary_cta_href) || DEFAULT_HOME_CONTENT.primary_cta_href,
      style: 'primary',
    },
    {
      id: 'find-doctors',
      label: readString(source?.secondary_cta_label) || DEFAULT_HOME_CONTENT.secondary_cta_label,
      href: readString(source?.secondary_cta_href) || DEFAULT_HOME_CONTENT.secondary_cta_href,
      style: 'secondary',
    },
    {
      id: 'view-committee',
      label: readString(source?.committee_cta_label) || DEFAULT_HOME_CONTENT.committee_cta_label,
      href: readString(source?.committee_cta_href) || DEFAULT_HOME_CONTENT.committee_cta_href,
      style: 'accent',
    },
  ] as HomeHeroButton[]

  return fallbackFromLegacy
}

function readBooleanWithFallback(
  source: Record<string, unknown> | null,
  key: keyof HomeContentConfig,
  fallback: boolean
) {
  const raw = source?.[key]
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') {
    const value = raw.trim().toLowerCase()
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return fallback
}

function readNumberWithFallback(
  source: Record<string, unknown> | null,
  key: keyof HomeContentConfig,
  fallback: number
) {
  const raw = source?.[key]
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.floor(raw)
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return Math.floor(parsed)
  }
  return fallback
}

export function parseHomeContentConfig(value: unknown): HomeContentConfig {
  const source = toRecord(value)
  const heroButtons = parseHeroButtons(source)
  const primaryButton = heroButtons[0] ?? DEFAULT_HOME_CONTENT.hero_buttons[0]
  const secondaryButton = heroButtons[1] ?? DEFAULT_HOME_CONTENT.hero_buttons[1]
  const committeeButton = heroButtons[2] ?? DEFAULT_HOME_CONTENT.hero_buttons[2]

  return {
    hero_badge: readWithFallback(source, 'hero_badge', DEFAULT_HOME_CONTENT.hero_badge),
    hero_title: readWithFallback(source, 'hero_title', DEFAULT_HOME_CONTENT.hero_title),
    hero_description: readWithFallback(source, 'hero_description', DEFAULT_HOME_CONTENT.hero_description),
    hero_background_image_url: readWithFallback(
      source,
      'hero_background_image_url',
      DEFAULT_HOME_CONTENT.hero_background_image_url
    ),
    hero_buttons: heroButtons,
    primary_cta_label: primaryButton.label,
    primary_cta_href: primaryButton.href,
    secondary_cta_label: secondaryButton.label,
    secondary_cta_href: secondaryButton.href,
    committee_cta_label: committeeButton.label,
    committee_cta_href: committeeButton.href,
    feature_point_1: readWithFallback(source, 'feature_point_1', DEFAULT_HOME_CONTENT.feature_point_1),
    feature_point_2: readWithFallback(source, 'feature_point_2', DEFAULT_HOME_CONTENT.feature_point_2),
    national_panel_badge: readWithFallback(
      source,
      'national_panel_badge',
      DEFAULT_HOME_CONTENT.national_panel_badge
    ),
    national_panel_title: readWithFallback(
      source,
      'national_panel_title',
      DEFAULT_HOME_CONTENT.national_panel_title
    ),
    national_panel_description: readWithFallback(
      source,
      'national_panel_description',
      DEFAULT_HOME_CONTENT.national_panel_description
    ),
    national_panel_image_url: readWithFallback(
      source,
      'national_panel_image_url',
      DEFAULT_HOME_CONTENT.national_panel_image_url
    ),
    national_panel_empty: readWithFallback(
      source,
      'national_panel_empty',
      DEFAULT_HOME_CONTENT.national_panel_empty
    ),
    national_panel_cta_label: readWithFallback(
      source,
      'national_panel_cta_label',
      DEFAULT_HOME_CONTENT.national_panel_cta_label
    ),
    national_panel_cta_href: readWithFallback(
      source,
      'national_panel_cta_href',
      DEFAULT_HOME_CONTENT.national_panel_cta_href
    ),
    show_directory_section: readBooleanWithFallback(
      source,
      'show_directory_section',
      DEFAULT_HOME_CONTENT.show_directory_section
    ),
    show_national_committee_section: readBooleanWithFallback(
      source,
      'show_national_committee_section',
      DEFAULT_HOME_CONTENT.show_national_committee_section
    ),
    show_features_section: readBooleanWithFallback(
      source,
      'show_features_section',
      DEFAULT_HOME_CONTENT.show_features_section
    ),
    show_stories_section: readBooleanWithFallback(
      source,
      'show_stories_section',
      DEFAULT_HOME_CONTENT.show_stories_section
    ),
    directory_section_order: readNumberWithFallback(
      source,
      'directory_section_order',
      DEFAULT_HOME_CONTENT.directory_section_order
    ),
    national_committee_section_order: readNumberWithFallback(
      source,
      'national_committee_section_order',
      DEFAULT_HOME_CONTENT.national_committee_section_order
    ),
    features_section_order: readNumberWithFallback(
      source,
      'features_section_order',
      DEFAULT_HOME_CONTENT.features_section_order
    ),
    stories_section_order: readNumberWithFallback(
      source,
      'stories_section_order',
      DEFAULT_HOME_CONTENT.stories_section_order
    ),
  }
}

export function isMissingSchemaError(errorMessage: string | undefined) {
  if (!errorMessage) return false
  return (
    errorMessage.includes('does not exist') ||
    errorMessage.includes('column') ||
    errorMessage.includes('relation')
  )
}
