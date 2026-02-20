'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const profileSchema = z.object({
  fullName: z.string().min(3, 'Name must be at least 3 characters'),
})

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const fullName = formData.get('fullName') as string
  const avatarFile = formData.get('avatar') as File

  const validated = profileSchema.safeParse({ fullName })

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  let avatarUrl = null

  // Handle File Upload if a new file is selected
  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split('.').pop()
    const filePath = `${user.id}/${Math.random()}.${fileExt}`

    // Upload to 'avatars' bucket
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { error: 'Failed to upload image. Please try again.' }
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)
    
    avatarUrl = publicUrl
  }

  const updates: { full_name: string; updated_at: string; avatar_url?: string } = {
    full_name: fullName,
    updated_at: new Date().toISOString(),
  }

  if (avatarUrl) {
    updates.avatar_url = avatarUrl
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/profile')
  
  return { success: 'Profile updated successfully' }
}
