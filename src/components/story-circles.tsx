'use client'

import { useMemo, useState } from 'react'
import { Calendar, Clock3 } from 'lucide-react'

type Story = {
  id: string
  title: string
  content: string
  image_url: string | null
  expires_at: string | null
  created_at: string
}

function formatDate(value: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleString()
}

function initialsFromTitle(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export default function StoryCircles({ stories }: { stories: Story[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(stories[0]?.id ?? null)

  const selectedStory = useMemo(() => {
    if (!selectedId) return stories[0] ?? null
    return stories.find((story) => story.id === selectedId) ?? stories[0] ?? null
  }, [selectedId, stories])

  if (!selectedStory) {
    return null
  }

  const selectedExpiresAt = formatDate(selectedStory.expires_at)
  const selectedCreatedAt = formatDate(selectedStory.created_at)

  return (
    <div className="space-y-5 sm:space-y-6 md:grid md:grid-cols-[240px,1fr] md:items-start md:gap-6 md:space-y-0">
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-4 md:max-h-[360px] md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pb-0 md:pr-1">
        {stories.map((story) => {
          const isSelected = story.id === selectedStory.id
          return (
            <button
              key={story.id}
              type="button"
              onClick={() => setSelectedId(story.id)}
              className="group w-24 shrink-0 text-left sm:w-28 md:flex md:w-full md:items-center md:gap-3"
            >
              <span
                className={`inline-flex h-20 w-20 items-center justify-center rounded-full p-[3px] sm:h-24 sm:w-24 md:h-14 md:w-14 ${
                  isSelected
                    ? 'bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500 shadow-md shadow-blue-200/90 dark:shadow-none'
                    : 'bg-gradient-to-br from-slate-300 to-slate-400 dark:from-gray-600 dark:to-gray-700'
                }`}
              >
                <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white dark:bg-gray-900">
                  {story.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={story.image_url}
                      alt={story.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                      {initialsFromTitle(story.title) || 'UP'}
                    </span>
                  )}
                </span>
              </span>
              <span
                className={`mt-2 block line-clamp-2 text-center text-xs font-semibold leading-4 md:mt-0 md:text-left md:text-sm md:leading-5 ${
                  isSelected ? 'text-blue-950 dark:text-white' : 'text-slate-600 dark:text-gray-400'
                }`}
              >
                {story.title}
              </span>
            </button>
          )
        })}
      </div>

      <article className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {selectedStory.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selectedStory.image_url}
            alt={selectedStory.title}
            loading="lazy"
            decoding="async"
            className="h-40 w-full object-cover sm:h-52"
          />
        )}
        <div className="border-b border-blue-100 bg-blue-900 px-5 py-3 text-blue-50 dark:border-gray-700 dark:bg-blue-950 sm:px-6">
          <h3 className="text-base font-semibold sm:text-lg">{selectedStory.title}</h3>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
            {selectedExpiresAt && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                <Clock3 className="h-3.5 w-3.5" />
                Expires {selectedExpiresAt}
              </span>
            )}
            {selectedCreatedAt && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 dark:bg-gray-700/70">
                <Calendar className="h-3.5 w-3.5" />
                {selectedCreatedAt}
              </span>
            )}
          </div>

          <div
            className="prose prose-sm max-w-none text-slate-700 dark:prose-invert dark:text-gray-200"
            dangerouslySetInnerHTML={{
              __html: selectedStory.content || '<p>No details provided.</p>',
            }}
          />
        </div>
      </article>
    </div>
  )
}
