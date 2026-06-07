import { useCallback, useEffect, useState } from 'react'
import type { CreateTournamentDraft, TournamentConfig } from '../types/tournament'
import {
  buildTournamentFromDraft,
  configToDraft,
} from '../tournament/builder'
import {
  deleteTournament,
  getTournament,
  listTournaments,
  loadRawResults,
  saveTournament,
  toSummary,
  updateTournamentFromDraft,
} from '../services/tournamentStorage'
import { deleteResultsForTournament, upsertManyResults } from '../services/resultsService'
import {
  removeTournamentBanner,
  uploadTournamentBanner,
} from '../services/mediaService'
import { syncTournamentsWithCloud } from '../services/tournamentSync'
import {
  deleteTournamentRemote,
  upsertTournament,
} from '../services/tournamentsService'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export interface TournamentBannerOptions {
  bannerFile?: File | null
  removeBanner?: boolean
}

async function applyTournamentBanner(
  config: TournamentConfig,
  options?: TournamentBannerOptions,
): Promise<TournamentConfig> {
  if (!options?.bannerFile && !options?.removeBanner) return config

  const now = new Date().toISOString()

  if (options.removeBanner) {
    await removeTournamentBanner(config.id)
    return { ...config, imageUrl: null, updatedAt: now }
  }

  if (options.bannerFile) {
    const imageUrl = await uploadTournamentBanner(config.id, options.bannerFile)
    return { ...config, imageUrl, updatedAt: now }
  }

  return config
}

export function useTournaments() {
  const [tournaments, setTournaments] = useState<TournamentConfig[]>(() => listTournaments())
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [cloudSetupNeeded, setCloudSetupNeeded] = useState(false)

  const applySyncResult = useCallback(
    (result: Awaited<ReturnType<typeof syncTournamentsWithCloud>>) => {
      setTournaments(result.tournaments)
      if (result.cloudWarning) {
        setCloudSetupNeeded(true)
        setSyncError(result.cloudWarning)
      } else {
        setCloudSetupNeeded(false)
        setSyncError(null)
      }
    },
    [],
  )

  const refreshLocal = useCallback(() => {
    setTournaments(listTournaments())
  }, [])

  const refreshFromCloud = useCallback(async () => {
    if (!isSupabaseConfigured) {
      refreshLocal()
      return
    }

    try {
      const result = await syncTournamentsWithCloud()
      applySyncResult(result)
    } catch (e) {
      setCloudSetupNeeded(false)
      setSyncError(e instanceof Error ? e.message : 'Failed to sync tournaments')
      refreshLocal()
    }
  }, [applySyncResult, refreshLocal])

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (!isSupabaseConfigured) {
        refreshLocal()
        setLoading(false)
        return
      }

      try {
        const result = await syncTournamentsWithCloud()
        if (!cancelled) applySyncResult(result)
      } catch (e) {
        if (!cancelled) {
          setCloudSetupNeeded(false)
          setSyncError(e instanceof Error ? e.message : 'Failed to sync tournaments')
          refreshLocal()
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void init()

    if (!supabase) return () => {
      cancelled = true
    }

    const client = supabase
    const channel = client
      .channel('tournaments-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments' },
        () => {
          void refreshFromCloud()
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  }, [applySyncResult, refreshFromCloud, refreshLocal])

  const create = useCallback(
    async (draft: CreateTournamentDraft, bannerOptions?: TournamentBannerOptions) => {
      let config = buildTournamentFromDraft(draft)
      saveTournament(config)
      refreshLocal()

      if (bannerOptions?.bannerFile || bannerOptions?.removeBanner) {
        try {
          config = await applyTournamentBanner(config, bannerOptions)
          saveTournament(config)
          refreshLocal()
        } catch (e) {
          setSyncError(e instanceof Error ? e.message : 'Failed to upload banner')
        }
      }

      if (isSupabaseConfigured && !cloudSetupNeeded) {
        try {
          await upsertTournament(config)
          setSyncError(null)
          await refreshFromCloud()
        } catch (e) {
          const message =
            e instanceof Error ? e.message : 'Failed to save tournament to cloud'
          setSyncError(message)
          throw new Error(message)
        }
      }

      return config
    },
    [cloudSetupNeeded, refreshFromCloud, refreshLocal],
  )

  const update = useCallback(
    (config: TournamentConfig) => {
      saveTournament({ ...config, updatedAt: new Date().toISOString() })
      refreshLocal()

      if (isSupabaseConfigured && !cloudSetupNeeded) {
        upsertTournament({ ...config, updatedAt: new Date().toISOString() })
          .then(() => {
            setSyncError(null)
            return refreshFromCloud()
          })
          .catch((e) => {
            setSyncError(e instanceof Error ? e.message : 'Failed to update tournament in cloud')
          })
      }
    },
    [cloudSetupNeeded, refreshFromCloud, refreshLocal],
  )

  const updateFromDraft = useCallback(
    async (id: string, draft: CreateTournamentDraft, bannerOptions?: TournamentBannerOptions) => {
      const existing = getTournament(id)
      if (!existing) return null
      let config = updateTournamentFromDraft(existing, draft)
      refreshLocal()

      if (bannerOptions?.bannerFile || bannerOptions?.removeBanner) {
        try {
          config = await applyTournamentBanner(config, bannerOptions)
          saveTournament(config)
          refreshLocal()
        } catch (e) {
          setSyncError(e instanceof Error ? e.message : 'Failed to upload banner')
        }
      }

      if (isSupabaseConfigured && !cloudSetupNeeded) {
        try {
          await upsertTournament(config)
          setSyncError(null)
          const results = loadRawResults(id)
          if (Object.keys(results).length > 0) {
            await upsertManyResults(id, results)
          }
          await refreshFromCloud()
        } catch (e) {
          const message =
            e instanceof Error ? e.message : 'Failed to sync tournament changes'
          setSyncError(message)
          throw new Error(message)
        }
      }

      return config
    },
    [cloudSetupNeeded, refreshFromCloud, refreshLocal],
  )

  const remove = useCallback(
    (id: string) => {
      const ok = deleteTournament(id)
      if (ok) refreshLocal()

      if (ok && isSupabaseConfigured && !cloudSetupNeeded) {
        Promise.all([deleteTournamentRemote(id), deleteResultsForTournament(id)])
          .then(() => {
            setSyncError(null)
            return refreshFromCloud()
          })
          .catch((e) => {
            setSyncError(e instanceof Error ? e.message : 'Failed to delete tournament from cloud')
          })
      }

      return ok
    },
    [cloudSetupNeeded, refreshFromCloud, refreshLocal],
  )

  const summaries = tournaments.map((t) => toSummary(t))

  return {
    tournaments,
    summaries,
    loading,
    syncError,
    cloudSetupNeeded,
    isCloudEnabled: isSupabaseConfigured,
    create,
    update,
    updateFromDraft,
    remove,
    refresh: refreshFromCloud,
    configToDraft,
  }
}
