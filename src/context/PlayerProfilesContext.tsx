import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  fetchPlayers,
  removePlayerAvatar,
  uploadPlayerAvatar,
} from '../services/playersService'

type AvatarMap = Record<string, string | null>

interface PlayerProfilesContextValue {
  avatars: AvatarMap
  loading: boolean
  error: string | null
  isCloudEnabled: boolean
  getAvatarUrl: (playerId: string) => string | null
  uploadAvatar: (playerId: string, file: File) => Promise<void>
  removeAvatar: (playerId: string) => Promise<void>
}

const PlayerProfilesContext = createContext<PlayerProfilesContextValue | null>(null)

export function PlayerProfilesProvider({ children }: { children: ReactNode }) {
  const [avatars, setAvatars] = useState<AvatarMap>({})
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  const loadPlayers = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const players = await fetchPlayers()
      const map: AvatarMap = {}
      for (const p of players) {
        map[p.id] = p.avatar_url
      }
      setAvatars(map)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load player profiles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlayers()
  }, [loadPlayers])

  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel('players-avatars')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        (payload) => {
          const row = payload.new as { id?: string; avatar_url?: string | null }
          if (row?.id) {
            setAvatars((prev) => ({ ...prev, [row.id!]: row.avatar_url ?? null }))
          }
        },
      )
      .subscribe()

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [])

  const getAvatarUrl = useCallback(
    (playerId: string) => avatars[playerId] ?? null,
    [avatars],
  )

  const uploadAvatar = useCallback(async (playerId: string, file: File) => {
    const url = await uploadPlayerAvatar(playerId, file)
    setAvatars((prev) => ({ ...prev, [playerId]: url }))
  }, [])

  const removeAvatar = useCallback(async (playerId: string) => {
    await removePlayerAvatar(playerId)
    setAvatars((prev) => ({ ...prev, [playerId]: null }))
  }, [])

  const value = useMemo(
    () => ({
      avatars,
      loading,
      error,
      isCloudEnabled: isSupabaseConfigured,
      getAvatarUrl,
      uploadAvatar,
      removeAvatar,
    }),
    [avatars, loading, error, getAvatarUrl, uploadAvatar, removeAvatar],
  )

  return (
    <PlayerProfilesContext.Provider value={value}>
      {children}
    </PlayerProfilesContext.Provider>
  )
}

export function usePlayerProfiles() {
  const ctx = useContext(PlayerProfilesContext)
  if (!ctx) {
    throw new Error('usePlayerProfiles must be used within PlayerProfilesProvider')
  }
  return ctx
}
