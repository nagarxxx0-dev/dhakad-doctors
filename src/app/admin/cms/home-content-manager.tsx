'use client'

import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { upsertHomeContent } from './actions'
import type { HomeContentConfig } from '@/utils/cms/home-content'

export default function HomeContentManager({ initialContent }: { initialContent: HomeContentConfig }) {
  const router = useRouter()
  const [form, setForm] = useState<HomeContentConfig>(initialContent)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const setField = <K extends keyof HomeContentConfig>(key: K, value: HomeContentConfig[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const addHeroButton = () => {
    setForm((prev) => {
      if (prev.hero_buttons.length >= 6) return prev
      const nextCount = prev.hero_buttons.length + 1
      return {
        ...prev,
        hero_buttons: [
          ...prev.hero_buttons,
          {
            id: `hero-btn-${nextCount}-${Date.now()}`,
            label: `Button ${nextCount}`,
            href: '/',
            style: 'secondary',
          },
        ],
      }
    })
  }

  const removeHeroButton = (buttonId: string) => {
    setForm((prev) => {
      if (prev.hero_buttons.length <= 1) return prev
      return {
        ...prev,
        hero_buttons: prev.hero_buttons.filter((button) => button.id !== buttonId),
      }
    })
  }

  const updateHeroButton = (
    buttonId: string,
    field: 'label' | 'href' | 'style',
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      hero_buttons: prev.hero_buttons.map((button) =>
        button.id === buttonId
          ? {
              ...button,
              [field]:
                field === 'style'
                  ? ((value === 'primary' || value === 'secondary' || value === 'accent'
                      ? value
                      : 'secondary') as 'primary' | 'secondary' | 'accent')
                  : value,
            }
          : button
      ),
    }))
  }

  const handleSubmit = () => {
    const formData = new FormData()
    for (const key of Object.keys(form) as Array<keyof HomeContentConfig>) {
      if (key === 'hero_buttons') continue
      const value = form[key]
      formData.append(key, typeof value === 'string' ? value : String(value))
    }
    formData.append('hero_buttons_json', JSON.stringify(form.hero_buttons))

    startTransition(async () => {
      const result = await upsertHomeContent(formData)
      if (result?.error) {
        const errorText =
          typeof result.error === 'string'
            ? result.error
            : Object.values(result.error)[0]?.[0] || 'Failed to update home content'
        setMessage({ type: 'error', text: errorText })
        return
      }

      setMessage({ type: 'success', text: 'Home page content updated successfully.' })
      router.refresh()
    })
  }

  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-blue-950 dark:text-white">Home Page Content</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
          Hero section and right-side National Committee banner ko yahin se edit karein.
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-xl border px-3 py-2 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-5">
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200">Hero Text</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Badge</span>
              <input
                value={form.hero_badge}
                onChange={(e) => setField('hero_badge', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Title</span>
            <input
              value={form.hero_title}
              onChange={(e) => setField('hero_title', e.target.value as HomeContentConfig['hero_title'])}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
          </div>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Description</span>
            <textarea
              value={form.hero_description}
              onChange={(e) => setField('hero_description', e.target.value as HomeContentConfig['hero_description'])}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Hero Background Image URL</span>
            <input
              value={form.hero_background_image_url}
              onChange={(e) =>
                setField('hero_background_image_url', e.target.value as HomeContentConfig['hero_background_image_url'])
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200">Hero Buttons</h3>
          <div className="space-y-3">
            {form.hero_buttons.map((button, index) => (
              <div
                key={button.id}
                className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 md:grid-cols-[1fr,1fr,130px,42px]"
              >
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Label {index + 1}</span>
                  <input
                    value={button.label}
                    onChange={(e) => updateHeroButton(button.id, 'label', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Link</span>
                  <input
                    value={button.href}
                    onChange={(e) => updateHeroButton(button.id, 'href', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Style</span>
                  <select
                    value={button.style}
                    onChange={(e) => updateHeroButton(button.id, 'style', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="accent">Accent</option>
                  </select>
                </label>
                <div className="self-end">
                  <button
                    onClick={() => removeHeroButton(button.id)}
                    disabled={form.hero_buttons.length <= 1}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200 dark:hover:bg-rose-900/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600 dark:text-gray-400">Minimum 1, maximum 6 hero buttons.</p>
              <button
                onClick={addHeroButton}
                disabled={form.hero_buttons.length >= 6}
                className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200 dark:hover:bg-blue-900/40"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Button
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200">Feature Points</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Point 1</span>
              <input
                value={form.feature_point_1}
                onChange={(e) => setField('feature_point_1', e.target.value as HomeContentConfig['feature_point_1'])}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Point 2</span>
              <input
                value={form.feature_point_2}
                onChange={(e) => setField('feature_point_2', e.target.value as HomeContentConfig['feature_point_2'])}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200">
            National Committee Banner (Right Panel)
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Badge</span>
              <input
                value={form.national_panel_badge}
                onChange={(e) =>
                  setField('national_panel_badge', e.target.value as HomeContentConfig['national_panel_badge'])
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Title</span>
              <input
                value={form.national_panel_title}
                onChange={(e) =>
                  setField('national_panel_title', e.target.value as HomeContentConfig['national_panel_title'])
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
          </div>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Description</span>
            <textarea
              value={form.national_panel_description}
              onChange={(e) =>
                setField('national_panel_description', e.target.value as HomeContentConfig['national_panel_description'])
              }
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Panel Image URL</span>
            <input
              value={form.national_panel_image_url}
              onChange={(e) =>
                setField('national_panel_image_url', e.target.value as HomeContentConfig['national_panel_image_url'])
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Empty Text</span>
              <input
                value={form.national_panel_empty}
                onChange={(e) =>
                  setField('national_panel_empty', e.target.value as HomeContentConfig['national_panel_empty'])
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">CTA Label</span>
              <input
                value={form.national_panel_cta_label}
                onChange={(e) =>
                  setField('national_panel_cta_label', e.target.value as HomeContentConfig['national_panel_cta_label'])
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">CTA Link</span>
              <input
                value={form.national_panel_cta_href}
                onChange={(e) =>
                  setField('national_panel_cta_href', e.target.value as HomeContentConfig['national_panel_cta_href'])
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200">
            Section Visibility and Order
          </h3>
          <div className="space-y-3">
            {[
              {
                label: 'Directory Section',
                toggleKey: 'show_directory_section' as const,
                orderKey: 'directory_section_order' as const,
              },
              {
                label: 'National Committee Section',
                toggleKey: 'show_national_committee_section' as const,
                orderKey: 'national_committee_section_order' as const,
              },
              {
                label: 'Features Section',
                toggleKey: 'show_features_section' as const,
                orderKey: 'features_section_order' as const,
              },
              {
                label: 'Stories Section',
                toggleKey: 'show_stories_section' as const,
                orderKey: 'stories_section_order' as const,
              },
            ].map((section) => (
              <div
                key={section.toggleKey}
                className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 md:grid-cols-[1fr,140px,120px]"
              >
                <p className="self-center text-sm font-semibold text-slate-800 dark:text-gray-200">{section.label}</p>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Visibility</span>
                  <select
                    value={form[section.toggleKey] ? 'true' : 'false'}
                    onChange={(e) =>
                      setField(section.toggleKey, (e.target.value === 'true') as HomeContentConfig[typeof section.toggleKey])
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="true">On</option>
                    <option value="false">Off</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Order</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={form[section.orderKey]}
                    onChange={(e) => {
                      const parsed = Number(e.target.value)
                      if (!Number.isFinite(parsed)) return
                      const normalized = Math.max(1, Math.min(99, Math.floor(parsed)))
                      setField(section.orderKey, normalized as HomeContentConfig[typeof section.orderKey])
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </label>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="inline-flex items-center rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Home Content
          </button>
        </div>
      </div>
    </div>
  )
}
