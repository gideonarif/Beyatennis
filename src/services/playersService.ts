import { AVATAR_BUCKET, supabase } from '../lib/supabase'

export interface DbPlayer {
  id: string
  name: string
  group: 'A' | 'B'
  avatar_url: string | null
}

export async function fetchPlayers(): Promise<DbPlayer[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('players')
    .select('id, name, group, avatar_url')

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    group: row.group as 'A' | 'B',
    avatar_url: row.avatar_url,
  }))
}

export async function updatePlayerAvatarUrl(
  playerId: string,
  avatarUrl: string,
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('players')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', playerId)

  if (error) throw error
}

export async function uploadPlayerAvatar(
  playerId: string,
  file: File,
): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const path = `${playerId}/avatar.${safeExt}`

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)

  const publicUrl = `${data.publicUrl}?t=${Date.now()}`
  await updatePlayerAvatarUrl(playerId, publicUrl)

  return publicUrl
}

export async function removePlayerAvatar(playerId: string): Promise<void> {
  if (!supabase) return

  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
  const paths = extensions.map((ext) => `${playerId}/avatar.${ext}`)

  await supabase.storage.from(AVATAR_BUCKET).remove(paths)

  const { error } = await supabase
    .from('players')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', playerId)

  if (error) throw error
}
