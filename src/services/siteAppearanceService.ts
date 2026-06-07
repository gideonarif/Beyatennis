import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  DEFAULT_SITE_APPEARANCE,
  type SiteAppearance,
} from '../types/siteAppearance'
import { siteSettingsSetupMessage } from './cloudErrors'

const STORAGE_KEY = 'ttt-site-appearance-v1'
const SETTINGS_ROW_ID = 'global'

function loadLocalAppearance(): SiteAppearance {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SITE_APPEARANCE
    return { ...DEFAULT_SITE_APPEARANCE, ...JSON.parse(raw) } as SiteAppearance
  } catch {
    return DEFAULT_SITE_APPEARANCE
  }
}

function saveLocalAppearance(appearance: SiteAppearance) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance))
}

export async function probeSiteSettingsCloud(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const { error } = await supabase.from('site_settings').select('id').limit(1)
  if (!error) return null
  return siteSettingsSetupMessage(error) ?? error.message
}

export async function loadSiteAppearance(): Promise<SiteAppearance> {
  const local = loadLocalAppearance()

  if (!isSupabaseConfigured || !supabase) return local

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('appearance, updated_at')
      .eq('id', SETTINGS_ROW_ID)
      .maybeSingle()

    if (error) throw error
    if (!data?.appearance) return local

    const remote = {
      ...DEFAULT_SITE_APPEARANCE,
      ...(data.appearance as SiteAppearance),
    }

    saveLocalAppearance(remote)
    localStorage.setItem(`${STORAGE_KEY}-updated`, data.updated_at as string)
    return remote
  } catch {
    return local
  }
}

export async function saveSiteAppearance(appearance: SiteAppearance): Promise<void> {
  const now = new Date().toISOString()
  saveLocalAppearance(appearance)
  localStorage.setItem(`${STORAGE_KEY}-updated`, now)

  if (!isSupabaseConfigured || !supabase) return

  const { error } = await supabase.from('site_settings').upsert({
    id: SETTINGS_ROW_ID,
    appearance,
    updated_at: now,
  })

  if (error) {
    const hint = siteSettingsSetupMessage(error)
    throw new Error(hint ?? error.message)
  }
}
