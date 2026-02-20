'use client'

import { useState, useTransition, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { upsertStory, deleteStory } from './actions'
import { Loader2, Save, Trash2, Edit2, Bold, Italic, List, Heading1, Heading2 } from 'lucide-react'

interface Story {
  id: string
  title: string
  content: string
  created_at: string
}

export default function StoryManager({ initialStories }: { initialStories: Story[] }) {
  const [stories, setStories] = useState<Story[]>(initialStories)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [isPending, startTransition] = useTransition()

  // Update local state when initialStories changes (e.g. after server revalidation)
  useEffect(() => {
    setStories(initialStories)
  }, [initialStories])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your story content here...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
      },
    },
  })

  const handleEdit = (story: Story) => {
    setEditingId(story.id)
    setTitle(story.title)
    editor?.commands.setContent(story.content)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancel = () => {
    setEditingId(null)
    setTitle('')
    editor?.commands.clearContent()
  }

  const handleSubmit = () => {
    if (!editor || editor.isEmpty || !title.trim()) return

    const content = editor.getHTML()
    const formData = new FormData()
    formData.append('title', title)
    formData.append('content', content)
    if (editingId) formData.append('id', editingId)

    startTransition(async () => {
      await upsertStory(formData)
      handleCancel()
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this story?')) return
    startTransition(async () => {
      await deleteStory(id)
    })
  }

  if (!editor) return null

  return (
    <div className="space-y-10">
      {/* Editor Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {editingId ? 'Edit Story' : 'Create New Story'}
          </h2>
          {editingId && (
            <button onClick={handleCancel} className="text-sm text-gray-500 hover:text-gray-700">
              Cancel Edit
            </button>
          )}
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Story Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-lg font-semibold px-4 py-2 border-b border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:border-blue-500 dark:text-white"
          />

          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}><Bold className="w-4 h-4" /></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded ${editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}><Italic className="w-4 h-4" /></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`}><Heading1 className="w-4 h-4" /></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`}><Heading2 className="w-4 h-4" /></button>
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded ${editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}><List className="w-4 h-4" /></button>
          </div>

          <div className="min-h-[200px] border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900/50">
            <EditorContent editor={editor} />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isPending || !title || editor.isEmpty}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editingId ? 'Update Story' : 'Publish Story'}
            </button>
          </div>
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Existing Stories</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <div key={story.id} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">{story.title}</h4>
                <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: story.content }} />
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => handleEdit(story)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(story.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {stories.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-500">
              No stories found. Create one above!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
