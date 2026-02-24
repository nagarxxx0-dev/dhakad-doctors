import { createClient } from '@/utils/supabase/server'
import StoryManager from './story-manager'
import HomeContentManager from './home-content-manager'
import {
  DEFAULT_HOME_CONTENT,
  HOME_CONTENT_KEY,
  isMissingSchemaError,
  parseHomeContentConfig,
} from '@/utils/cms/home-content'

export default async function CmsPage() {
  const supabase = await createClient()

  let homeContent = DEFAULT_HOME_CONTENT
  const { data: homeSetting, error: homeError } = await supabase
    .from('cms_settings')
    .select('value')
    .eq('key', HOME_CONTENT_KEY)
    .maybeSingle()

  if (!homeError) {
    homeContent = parseHomeContentConfig((homeSetting as { value?: unknown } | null)?.value)
  } else if (!isMissingSchemaError(homeError.message)) {
    console.error('Failed to load home CMS settings:', homeError.message)
  }

  const { data: stories } = await supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-7">
        <div className="inline-flex rounded-full bg-blue-900 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-50">
          Content Studio
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-blue-950 dark:text-white sm:text-3xl">
          Stories Management
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-300 sm:text-base">
          Edit homepage text/buttons and publish circular updates from one place.
        </p>
      </div>
      <div className="space-y-8">
        <HomeContentManager initialContent={homeContent} />
        <StoryManager initialStories={stories || []} />
      </div>
    </div>
  )
}
