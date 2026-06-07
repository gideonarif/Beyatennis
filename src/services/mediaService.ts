import {
  AVATAR_BUCKET,
  isSupabaseConfigured,
  supabase,
} from '../lib/supabase'
import { isEmbeddedImageUrl, storageUploadMessage } from './cloudErrors'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 5

/** Folder prefixes inside the shared public storage bucket. */
const BANNER_PREFIX = 'tournament-banners'
const SITE_PREFIX = 'site-media'

export type MediaUploadSource = 'cloud' | 'local'

export interface MediaUploadResult {
  url: string
  source: MediaUploadSource
}

function validateImageFile(file: File): void {
  if (!IMAGE_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG, WebP, or GIF)')
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image must be under ${MAX_SIZE_MB}MB`)
  }
}

function fileExtension(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read image file'))
    reader.readAsDataURL(file)
  })
}

async function uploadToBucket(
  bucket: string,
  path: string,
  file: File,
): Promise<string> {
  if (!supabase) throw new Error('Cloud storage is not configured')

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

/**
 * Upload media. When Supabase is configured, uploads to cloud storage only
 * (no silent local fallback). Without Supabase, stores an embedded data URL.
 */
async function uploadMedia(path: string, file: File): Promise<MediaUploadResult> {
  validateImageFile(file)

  if (!isSupabaseConfigured || !supabase) {
    return { url: await readFileAsDataUrl(file), source: 'local' }
  }

  try {
    const url = await uploadToBucket(AVATAR_BUCKET, path, file)
    return { url, source: 'cloud' }
  } catch (error) {
    throw new Error(storageUploadMessage(error))
  }
}

/** Upload tournament banner; uses player-avatars bucket with a dedicated folder. */
export async function uploadTournamentBanner(
  tournamentId: string,
  file: File,
): Promise<string> {
  const path = `${BANNER_PREFIX}/${tournamentId}/banner.${fileExtension(file)}`
  const { url, source } = await uploadMedia(path, file)
  if (isSupabaseConfigured && source !== 'cloud') {
    throw new Error('Banner was not uploaded to cloud storage')
  }
  if (isEmbeddedImageUrl(url) && isSupabaseConfigured) {
    throw new Error('Banner was stored locally only. Cloud upload is required when Supabase is configured.')
  }
  return url
}

export async function removeTournamentBanner(tournamentId: string): Promise<void> {
  if (!supabase) return

  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
  const paths = extensions.map((ext) => `${BANNER_PREFIX}/${tournamentId}/banner.${ext}`)
  await supabase.storage.from(AVATAR_BUCKET).remove(paths)
}

export async function uploadSiteBackgroundImage(file: File): Promise<string> {
  const path = `${SITE_PREFIX}/background.${fileExtension(file)}`
  const { url, source } = await uploadMedia(path, file)
  if (isSupabaseConfigured && source !== 'cloud') {
    throw new Error('Background image was not uploaded to cloud storage')
  }
  if (isEmbeddedImageUrl(url) && isSupabaseConfigured) {
    throw new Error('Background image was stored locally only. Cloud upload is required when Supabase is configured.')
  }
  return url
}

export async function removeSiteBackgroundImage(): Promise<void> {
  if (!supabase) return

  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
  const paths = extensions.map((ext) => `${SITE_PREFIX}/background.${ext}`)
  await supabase.storage.from(AVATAR_BUCKET).remove(paths)
}
