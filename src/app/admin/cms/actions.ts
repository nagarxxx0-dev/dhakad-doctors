'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { uploadPublicFile } from '@/utils/storage/public-upload'
import { HOME_CONTENT_KEY, parseHomeContentConfig } from '@/utils/cms/home-content'

const storySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  image_url: z.string().url('Invalid image URL').optional(),
  expires_at: z.string().optional(),
})

const heroButtonSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(40),
  href: z.string().min(1).max(240),
  style: z.enum(['primary', 'secondary', 'accent']),
})

const homeContentSchema = z.object({
  hero_badge: z.string().min(1, 'Hero badge is required'),
  hero_title: z.string().min(3, 'Hero title is required'),
  hero_description: z.string().min(10, 'Hero description is required'),
  hero_background_image_url: z.string().optional(),
  hero_buttons: z.array(heroButtonSchema).min(1, 'At least 1 hero button is required').max(6),
  primary_cta_label: z.string().optional(),
  primary_cta_href: z.string().optional(),
  secondary_cta_label: z.string().optional(),
  secondary_cta_href: z.string().optional(),
  committee_cta_label: z.string().optional(),
  committee_cta_href: z.string().optional(),
  feature_point_1: z.string().min(1, 'Feature point 1 is required'),
  feature_point_2: z.string().min(1, 'Feature point 2 is required'),
  national_panel_badge: z.string().min(1, 'National panel badge is required'),
  national_panel_title: z.string().min(1, 'National panel title is required'),
  national_panel_description: z.string().min(1, 'National panel description is required'),
  national_panel_image_url: z.string().optional(),
  national_panel_empty: z.string().min(1, 'National panel empty text is required'),
  national_panel_cta_label: z.string().min(1, 'National panel button label is required'),
  national_panel_cta_href: z.string().min(1, 'National panel button link is required'),
  show_directory_section: z.boolean(),
  show_national_committee_section: z.boolean(),
  show_features_section: z.boolean(),
  show_stories_section: z.boolean(),
  directory_section_order: z.number().int().min(1).max(99),
  national_committee_section_order: z.number().int().min(1).max(99),
  features_section_order: z.number().int().min(1).max(99),
  stories_section_order: z.number().int().min(1).max(99),
})

function isMissingSchemaError(errorMessage: string | undefined) {
  if (!errorMessage) return false
  return (
    errorMessage.includes('does not exist') ||
    errorMessage.includes('column') ||
    errorMessage.includes('relation')
  )
}

function parseExpiresAt(expiresAtValue: string | undefined) {
  if (!expiresAtValue) {
    return { value: null as string | null, error: null as string | null }
  }

  const parsed = new Date(expiresAtValue)
  if (Number.isNaN(parsed.getTime())) {
    return { value: null as string | null, error: 'Invalid expiry date' }
  }

  return { value: parsed.toISOString(), error: null as string | null }
}

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return { user: null, error: 'Admin access required' }
  }

  return { user, error: null }
}

async function uploadStoryImage(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  imageFile: File
}) {
  const { imageFile, userId, supabase } = params
  const upload = await uploadPublicFile({
    supabase,
    file: imageFile,
    ownerId: userId,
    supabaseBucket: 'stories',
  })

  if (upload.error || !upload.url) {
    return {
      url: null as string | null,
      error: upload.error || 'Image upload failed.',
    }
  }

  return { url: upload.url, error: null as string | null }
}

export async function upsertStory(formData: FormData) {
  const supabase = await createClient()

  const adminCheck = await verifyAdmin(supabase)
  if (adminCheck.error || !adminCheck.user) {
    return { error: adminCheck.error || 'Unauthorized' }
  }

  const rawData = {
    id: formData.get('id')?.toString() || undefined,
    title: formData.get('title')?.toString(),
    content: formData.get('content')?.toString(),
    image_url: formData.get('image_url')?.toString() || undefined,
    expires_at: formData.get('expires_at')?.toString() || undefined,
  }

  const validated = storySchema.safeParse(rawData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const { id, title, content } = validated.data
  let imageUrl = validated.data.image_url || null

  const imageFile = formData.get('image')
  if (imageFile instanceof File && imageFile.size > 0) {
    const upload = await uploadStoryImage({
      supabase,
      userId: adminCheck.user.id,
      imageFile,
    })
    if (upload.error) {
      return { error: upload.error }
    }
    imageUrl = upload.url
  }

  const expiresAtParsed = parseExpiresAt(validated.data.expires_at)
  if (expiresAtParsed.error) {
    return { error: expiresAtParsed.error }
  }

  const baseStoryData: Record<string, string | null> = {
    title,
    content,
    image_url: imageUrl,
    expires_at: expiresAtParsed.value,
    user_id: adminCheck.user.id,
    updated_at: new Date().toISOString(),
  }

  // Backward-compatible payload combinations for deployments missing newer columns.
  const storyPayloads: Array<Record<string, string | null>> = [
    baseStoryData,
    { ...baseStoryData, expires_at: null, image_url: imageUrl },
    { ...baseStoryData, image_url: null },
    { title, content, user_id: adminCheck.user.id, updated_at: new Date().toISOString() },
  ]

  let lastError: string | null = null

  for (const payload of storyPayloads) {
    let errorMessage: string | null = null
    if (id) {
      const { error } = await supabase.from('stories').update(payload).eq('id', id)
      errorMessage = error?.message ?? null
    } else {
      const { error } = await supabase.from('stories').insert(payload)
      errorMessage = error?.message ?? null
    }

    if (!errorMessage) {
      revalidatePath('/admin/cms')
      revalidatePath('/')
      return { success: 'Story saved successfully' }
    }

    lastError = errorMessage
    if (!isMissingSchemaError(errorMessage)) {
      break
    }
  }

  return { error: lastError || 'Failed to save story' }
}

export async function deleteStory(id: string) {
  const supabase = await createClient()
  const adminCheck = await verifyAdmin(supabase)
  if (adminCheck.error) return { error: adminCheck.error }

  const { error } = await supabase.from('stories').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/cms')
  revalidatePath('/')
  return { success: 'Story deleted' }
}

export async function upsertHomeContent(formData: FormData) {
  const supabase = await createClient()

  const adminCheck = await verifyAdmin(supabase)
  if (adminCheck.error || !adminCheck.user) {
    return { error: adminCheck.error || 'Unauthorized' }
  }

  const readBooleanForm = (key: string, fallback: boolean) => {
    const value = formData.get(key)?.toString().trim().toLowerCase()
    if (value === 'true') return true
    if (value === 'false') return false
    return fallback
  }

  const readOrderForm = (key: string, fallback: number) => {
    const value = formData.get(key)?.toString().trim()
    if (!value) return fallback
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return Math.max(1, Math.min(99, Math.floor(parsed)))
  }

  const readHeroButtonsForm = () => {
    const raw = formData.get('hero_buttons_json')?.toString().trim()
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const heroButtons = readHeroButtonsForm()
  const primaryButton = (heroButtons[0] as Record<string, unknown> | undefined) ?? null
  const secondaryButton = (heroButtons[1] as Record<string, unknown> | undefined) ?? null
  const committeeButton = (heroButtons[2] as Record<string, unknown> | undefined) ?? null

  const rawData = {
    hero_badge: formData.get('hero_badge')?.toString(),
    hero_title: formData.get('hero_title')?.toString(),
    hero_description: formData.get('hero_description')?.toString(),
    hero_background_image_url: formData.get('hero_background_image_url')?.toString() || '',
    hero_buttons: heroButtons,
    primary_cta_label:
      typeof primaryButton?.label === 'string' ? primaryButton.label : formData.get('primary_cta_label')?.toString(),
    primary_cta_href:
      typeof primaryButton?.href === 'string' ? primaryButton.href : formData.get('primary_cta_href')?.toString(),
    secondary_cta_label:
      typeof secondaryButton?.label === 'string'
        ? secondaryButton.label
        : formData.get('secondary_cta_label')?.toString(),
    secondary_cta_href:
      typeof secondaryButton?.href === 'string'
        ? secondaryButton.href
        : formData.get('secondary_cta_href')?.toString(),
    committee_cta_label:
      typeof committeeButton?.label === 'string'
        ? committeeButton.label
        : formData.get('committee_cta_label')?.toString(),
    committee_cta_href:
      typeof committeeButton?.href === 'string'
        ? committeeButton.href
        : formData.get('committee_cta_href')?.toString(),
    feature_point_1: formData.get('feature_point_1')?.toString(),
    feature_point_2: formData.get('feature_point_2')?.toString(),
    national_panel_badge: formData.get('national_panel_badge')?.toString(),
    national_panel_title: formData.get('national_panel_title')?.toString(),
    national_panel_description: formData.get('national_panel_description')?.toString(),
    national_panel_image_url: formData.get('national_panel_image_url')?.toString() || '',
    national_panel_empty: formData.get('national_panel_empty')?.toString(),
    national_panel_cta_label: formData.get('national_panel_cta_label')?.toString(),
    national_panel_cta_href: formData.get('national_panel_cta_href')?.toString(),
    show_directory_section: readBooleanForm('show_directory_section', true),
    show_national_committee_section: readBooleanForm('show_national_committee_section', true),
    show_features_section: readBooleanForm('show_features_section', true),
    show_stories_section: readBooleanForm('show_stories_section', true),
    directory_section_order: readOrderForm('directory_section_order', 1),
    national_committee_section_order: readOrderForm('national_committee_section_order', 2),
    features_section_order: readOrderForm('features_section_order', 3),
    stories_section_order: readOrderForm('stories_section_order', 4),
  }

  const validated = homeContentSchema.safeParse(rawData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const payloadValue = parseHomeContentConfig(validated.data)
  const updatedAt = new Date().toISOString()
  const payloads: Array<Record<string, unknown>> = [
    {
      key: HOME_CONTENT_KEY,
      value: payloadValue,
      updated_at: updatedAt,
      updated_by: adminCheck.user.id,
    },
    {
      key: HOME_CONTENT_KEY,
      value: payloadValue,
      updated_at: updatedAt,
    },
    {
      key: HOME_CONTENT_KEY,
      value: payloadValue,
    },
  ]

  let lastError: string | null = null

  for (const payload of payloads) {
    const { error } = await supabase.from('cms_settings').upsert(payload, { onConflict: 'key' })

    if (!error) {
      revalidatePath('/admin/cms')
      revalidatePath('/')
      return { success: 'Home content updated successfully' }
    }

    lastError = error.message
    if (!isMissingSchemaError(error.message)) {
      break
    }
  }

  if (isMissingSchemaError(lastError || undefined)) {
    return { error: 'cms_settings schema missing. Run latest Supabase migration first.' }
  }

  return { error: lastError || 'Failed to update home content' }
}
