'use client'

import { useRef, useState, useTransition } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { upsertStory, deleteStory } from './actions'
import { useRouter } from 'next/navigation'
import { Bold, CalendarClock, Edit2, Heading1, Heading2, ImagePlus, Italic, List, Loader2, Save, Trash2 } from 'lucide-react'

interface Story {
  id: string
  title: string
  content: string
  image_url?: string | null
  expires_at?: string | null
  created_at: string
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export default function StoryManager({ initialStories }: { initialStories: Story[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stories = initialStories

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your update content here...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[180px] p-4',
      },
    },
  })

  const handleEdit = (story: Story) => {
    setEditingId(story.id)
    setTitle(story.title)
    setImageUrl(story.image_url || '')
    setExpiresAt(toDateTimeLocal(story.expires_at))
    setSelectedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    editor?.commands.setContent(story.content)
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancel = () => {
    setEditingId(null)
    setTitle('')
    setImageUrl('')
    setExpiresAt('')
    setSelectedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    editor?.commands.clearContent()
    setMessage(null)
  }

  const handleSubmit = () => {
    if (!editor || !title.trim()) return
    const wasEditing = Boolean(editingId)

    const content = editor.getHTML()
    const formData = new FormData()
    formData.append('title', title)
    formData.append('content', content)
    if (editingId) formData.append('id', editingId)
    if (imageUrl) formData.append('image_url', imageUrl)
    if (expiresAt) formData.append('expires_at', expiresAt)
    if (selectedImage) formData.append('image', selectedImage)

    startTransition(async () => {
      const result = await upsertStory(formData)
      if (result?.error) {
        const errorText =
          typeof result.error === 'string'
            ? result.error
            : Object.values(result.error)[0]?.[0] || 'Failed to save story'
        setMessage({ type: 'error', text: errorText })
        return
      }

      setEditingId(null)
      setTitle('')
      setImageUrl('')
      setExpiresAt('')
      setSelectedImage(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      editor.commands.clearContent()
      setMessage({
        type: 'success',
        text: wasEditing ? 'Story updated successfully' : 'Story published successfully',
      })
      router.refresh()
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this story?')) return
    startTransition(async () => {
      const result = await deleteStory(id)
      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
        return
      }
      setMessage({ type: 'success', text: 'Story deleted successfully' })
      router.refresh()
    })
  }

  if (!editor) return null

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold tracking-tight text-blue-950 dark:text-white">
            {editingId ? 'Edit Expiring Update' : 'Create Expiring Update'}
          </h2>
          {editingId && (
            <button
              onClick={handleCancel}
              className="inline-flex w-fit items-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancel Edit
            </button>
          )}
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

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Story Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300">
                <ImagePlus className="w-4 h-4" />
                Story Image URL (optional)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300">
                <CalendarClock className="w-4 h-4" />
                Expires At
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Upload Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-700 dark:text-gray-200 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-800"
            />
            <p className="text-xs text-slate-500 dark:text-gray-400">
              File upload URL field se zyada priority lega. Image ko circular story UI me dikhaya jayega.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-gray-700 dark:bg-gray-900/50">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={`rounded-lg p-2 ${editor.isActive('bold') ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100' : 'text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}><Bold className="w-4 h-4" /></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`rounded-lg p-2 ${editor.isActive('italic') ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100' : 'text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}><Italic className="w-4 h-4" /></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`rounded-lg p-2 ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100' : 'text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}><Heading1 className="w-4 h-4" /></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`rounded-lg p-2 ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100' : 'text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}><Heading2 className="w-4 h-4" /></button>
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`rounded-lg p-2 ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100' : 'text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}><List className="w-4 h-4" /></button>
          </div>

          <div className="min-h-[180px] rounded-xl border border-slate-200 bg-slate-50 dark:border-gray-700 dark:bg-gray-900/50">
            <EditorContent editor={editor} />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isPending || !title}
              className="flex items-center rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editingId ? 'Update Story' : 'Publish Story'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-blue-950 dark:text-white">Existing Stories</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => {
            return (
              <div key={story.id} className="flex flex-col justify-between rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div>
                  {story.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={story.image_url} alt={story.title} loading="lazy" decoding="async" className="mb-3 h-36 w-full rounded-xl border border-slate-200 object-cover dark:border-gray-700" />
                  )}
                  <h4 className="mb-2 line-clamp-2 font-bold text-blue-950 dark:text-white">{story.title}</h4>
                  <div className="prose prose-sm line-clamp-3 text-slate-600 dark:prose-invert dark:text-gray-300" dangerouslySetInnerHTML={{ __html: story.content }} />
                  <div className="mt-3 text-xs text-slate-500 dark:text-gray-400">
                    {story.expires_at ? (
                      <p>Expires at {new Date(story.expires_at).toLocaleString()}</p>
                    ) : (
                      <p>No expiry set</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-gray-700">
                  <button
                    onClick={() => handleEdit(story)}
                    className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200 dark:hover:bg-blue-900/40"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(story.id)}
                    className="rounded-xl border border-rose-100 bg-rose-50 p-2 text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200 dark:hover:bg-rose-900/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
          {stories.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              No stories found. Create one above!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
