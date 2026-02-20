'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const storySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, 'Title is required'),
  content: z.string().min(10, 'Content is too short'),
})

export async function upsertStory(formData: FormData) {
  const supabase = await createClient()
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const rawData = {
    id: formData.get('id')?.toString() || undefined,
    title: formData.get('title')?.toString(),
    content: formData.get('content')?.toString(),
  }

  const validated = storySchema.safeParse(rawData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const { id, title, content } = validated.data

  const storyData = {
    title,
    content,
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }

  let error
  if (id) {
    // Update
    const { error: updateError } = await supabase.from('stories').update(storyData).eq('id', id)
    error = updateError
  } else {
    // Insert
    const { error: insertError } = await supabase.from('stories').insert(storyData)
    error = insertError
  }

  if (error) return { error: error.message }

  revalidatePath('/admin/cms')
  revalidatePath('/') // Revalidate home if stories are shown there
  return { success: 'Story saved successfully' }
}

export async function deleteStory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('stories').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/cms')
  return { success: 'Story deleted' }
}