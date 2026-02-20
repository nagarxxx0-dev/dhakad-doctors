import { createClient } from '@/utils/supabase/server'
import StoryManager from './story-manager'

export default async function CmsPage() {
  const supabase = await createClient()
  
  const { data: stories } = await supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Content Management</h1>
      <StoryManager initialStories={stories || []} />
    </div>
  )
}