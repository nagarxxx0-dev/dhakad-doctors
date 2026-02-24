import { createClient } from '@/utils/supabase/server'
import StoryCircles from './story-circles'

type Story = {
  id: string
  title: string
  content: string
  image_url: string | null
  expires_at: string | null
  created_at: string
}

type LegacyStory = {
  id: string
  title: string
  content: string
  created_at: string
}

function isMissingColumnError(message?: string) {
  if (!message) return false
  return message.includes('column') && message.includes('does not exist')
}

function isActiveStory(story: Story) {
  if (!story.expires_at) return true
  const expiresAt = new Date(story.expires_at)
  if (Number.isNaN(expiresAt.getTime())) return true
  return expiresAt.getTime() > Date.now()
}

export default async function Stories() {
  const supabase = await createClient()

  let stories: Story[] = []

  const { data, error } = await supabase
    .from('stories')
    .select('id, title, content, image_url, expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(24)

  if (!error) {
    stories = (data as Story[] | null) ?? []
  } else if (isMissingColumnError(error.message)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from('stories')
      .select('id, title, content, created_at')
      .order('created_at', { ascending: false })
      .limit(24)

    if (!legacyError) {
      const legacyStories = (legacyData as LegacyStory[] | null) ?? []
      stories = legacyStories.map((story) => ({
        ...story,
        image_url: null,
        expires_at: null,
      }))
    }
  } else {
    console.error('Failed to load stories:', error.message)
  }

  const activeStories = stories.filter(isActiveStory)

  if (activeStories.length === 0) {
    return null
  }

  return (
    <section className="relative overflow-hidden border-y border-blue-100 bg-gradient-to-b from-slate-100 to-white py-10 sm:py-12 dark:border-gray-800 dark:from-gray-900 dark:to-gray-900">
      <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-cyan-200/30 blur-3xl dark:bg-cyan-900/20" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-4 sm:mb-8 md:grid-cols-[1fr,280px] md:items-end">
          <div>
            <span className="inline-flex rounded-full bg-blue-900 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-50">
              Community Feed
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-blue-950 sm:text-3xl dark:text-white">
              Expiring Updates
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-gray-400">
              Circular story style updates for announcements. Expired stories auto-hide from homepage.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Active Stories
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-950 dark:text-white">{activeStories.length}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">Visible right now on home feed</p>
          </div>
        </div>

        <StoryCircles stories={activeStories} />
      </div>
    </section>
  )
}
