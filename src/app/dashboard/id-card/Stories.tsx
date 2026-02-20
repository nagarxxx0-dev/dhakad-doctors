import { createClient } from '@/utils/supabase/server'
import { Calendar } from 'lucide-react'

export default async function Stories() {
  const supabase = await createClient()
  
  const { data: stories } = await supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(6)

  if (!stories || stories.length === 0) {
    return null
  }

  return (
    <section className="py-12 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">Community Stories</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <article key={story.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col">
              <div className="p-6 flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">
                  {story.title}
                </h3>
                <div className="prose prose-sm dark:prose-invert line-clamp-4 text-gray-600 dark:text-gray-300 mb-4" dangerouslySetInnerHTML={{ __html: story.content }} />
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4 mr-2" />
                {new Date(story.created_at).toLocaleDateString()}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}