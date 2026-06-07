import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  loadSiteAppearance,
  probeSiteSettingsCloud,
  saveSiteAppearance,
} from '../services/siteAppearanceService'
import {
  DEFAULT_SITE_APPEARANCE,
  siteAppearanceToStyle,
  type SiteAppearance,
} from '../types/siteAppearance'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface SiteAppearanceContextValue {
  appearance: SiteAppearance
  backgroundStyle: Record<string, string | number>
  loading: boolean
  cloudWarning: string | null
  updateAppearance: (next: SiteAppearance) => Promise<void>
}

const SiteAppearanceContext = createContext<SiteAppearanceContextValue | null>(null)

export function SiteAppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<SiteAppearance>(DEFAULT_SITE_APPEARANCE)
  const [loading, setLoading] = useState(true)
  const [cloudWarning, setCloudWarning] = useState<string | null>(null)

  const refresh = async () => {
    const loaded = await loadSiteAppearance()
    setAppearance(loaded)
    if (isSupabaseConfigured) {
      const warning = await probeSiteSettingsCloud()
      setCloudWarning(warning)
    }
  }

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const loaded = await loadSiteAppearance()
      if (cancelled) return
      setAppearance(loaded)

      if (isSupabaseConfigured) {
        const warning = await probeSiteSettingsCloud()
        if (!cancelled) setCloudWarning(warning)
      }

      if (!cancelled) setLoading(false)
    })()

    if (!supabase) return () => {
      cancelled = true
    }

    const client = supabase

    const channel = client
      .channel('site-settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        () => {
          void refresh()
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  }, [])

  const updateAppearance = async (next: SiteAppearance) => {
    await saveSiteAppearance(next)
    setAppearance(next)
    if (isSupabaseConfigured) {
      const warning = await probeSiteSettingsCloud()
      setCloudWarning(warning)
    }
  }

  const backgroundStyle = useMemo(() => siteAppearanceToStyle(appearance), [appearance])

  return (
    <SiteAppearanceContext.Provider
      value={{
        appearance,
        backgroundStyle,
        loading: loading && isSupabaseConfigured,
        cloudWarning,
        updateAppearance,
      }}
    >
      {children}
    </SiteAppearanceContext.Provider>
  )
}

export function useSiteAppearance() {
  const ctx = useContext(SiteAppearanceContext)
  if (!ctx) {
    throw new Error('useSiteAppearance must be used within SiteAppearanceProvider')
  }
  return ctx
}
