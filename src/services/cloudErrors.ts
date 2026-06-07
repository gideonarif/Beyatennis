export const CLOUD_MIGRATION_HINT =
  'Open Supabase → SQL Editor and run the script in supabase/tournaments_cloud.sql'

export const SITE_APPEARANCE_MIGRATION_HINT =
  'Open Supabase → SQL Editor and run the script in supabase/site_appearance_cloud.sql'

export function isTournamentsTableMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; message?: string }
  return (
    e.code === 'PGRST205' ||
    (typeof e.message === 'string' && e.message.includes("'public.tournaments'"))
  )
}

export function isTournamentIdColumnMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; message?: string }
  return (
    e.code === '42703' ||
    (typeof e.message === 'string' && e.message.includes('tournament_id'))
  )
}

export function isSiteSettingsTableMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; message?: string }
  return (
    e.code === 'PGRST205' ||
    (typeof e.message === 'string' && e.message.includes("'public.site_settings'"))
  )
}

export function isStorageBucketMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const message =
    'message' in error ? String((error as { message: unknown }).message) : String(error)
  return /bucket not found/i.test(message)
}

export function cloudSetupMessage(error: unknown): string | null {
  if (isTournamentsTableMissing(error)) {
    return `Cloud database setup required. ${CLOUD_MIGRATION_HINT}. Using local tournaments until then.`
  }
  if (isTournamentIdColumnMissing(error)) {
    return `Match results table needs updating. ${CLOUD_MIGRATION_HINT}.`
  }
  return null
}

export function siteSettingsSetupMessage(error: unknown): string | null {
  if (isSiteSettingsTableMissing(error)) {
    return `Site appearance is saved on this device only. Run supabase/site_appearance_cloud.sql in Supabase to sync across devices.`
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message)
    if (message) return message
  }
  return null
}

export function storageUploadMessage(error: unknown): string {
  if (isStorageBucketMissing(error)) {
    return 'Cloud storage bucket "player-avatars" was not found. Run supabase/schema.sql in Supabase SQL Editor, then try again.'
  }
  if (error instanceof Error && error.message) return error.message
  return 'Cloud image upload failed'
}

export function isEmbeddedImageUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.startsWith('data:')
}
