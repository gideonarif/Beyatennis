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
import { syncTournamentsWithCloud } from '../services/tournamentSync'
import {
  deleteTournamentRemote,
  upsertTournament,
} from '../services/tournamentsService'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function useTournaments() {
  const [tournaments, setTournaments] = useState<TournamentConfig[]>(() => listTournaments())
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [syncError, setSyncError] = useState<string | null>(null)

  const refreshLocal = useCallback(() => {
    setTournaments(listTournaments())
  }, [])

  const refreshFromCloud = useCallback(async () => {
    if (!isSupabaseConfigured) {
      refreshLocal()
      return
    }

    try {
      setSyncError(null)
      const merged = await syncTournamentsWithCloud()
      setTournaments(merged)
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Failed to sync tournaments')
      refreshLocal()
    }
  }, [refreshLocal])

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (!isSupabaseConfigured) {
        refreshLocal()
        setLoading(false)
        return
      }

      try {
        setSyncError(null)
        const merged = await syncTournamentsWithCloud()
        if (!cancelled) setTournaments(merged)
      } catch (e) {
        if (!cancelled) {
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
  }, [refreshFromCloud, refreshLocal])

  const create = useCallback(
    (draft: CreateTournamentDraft) => {
      const config = buildTournamentFromDraft(draft)
      saveTournament(config)
      refreshLocal()

      if (isSupabaseConfigured) {
        upsertTournament(config)
          .then(() => {
            setSyncError(null)
            return refreshFromCloud()
          })
          .catch((e) => {
            setSyncError(e instanceof Error ? e.message : 'Failed to save tournament to cloud')
          })
      }

      return config
    },
    [refreshFromCloud, refreshLocal],
  )

  const update = useCallback(
    (config: TournamentConfig) => {
      saveTournament({ ...config, updatedAt: new Date().toISOString() })
      refreshLocal()

      if (isSupabaseConfigured) {
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
    [refreshFromCloud, refreshLocal],
  )

  const updateFromDraft = useCallback(
    (id: string, draft: CreateTournamentDraft) => {
      const existing = getTournament(id)
      if (!existing) return null
      const config = updateTournamentFromDraft(existing, draft)
      refreshLocal()

      if (isSupabaseConfigured) {
        upsertTournament(config)
          .then(() => {
            setSyncError(null)
            const results = loadRawResults(id)
            if (Object.keys(results).length > 0) {
              return upsertManyResults(id, results)
            }
          })
          .then(() => refreshFromCloud())
          .catch((e) => {
            setSyncError(e instanceof Error ? e.message : 'Failed to sync tournament changes')
          })
      }

      return config
    },
    [refreshFromCloud, refreshLocal],
  )

  const remove = useCallback(
    (id: string) => {
      const ok = deleteTournament(id)
      if (ok) refreshLocal()

      if (ok && isSupabaseConfigured) {
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
    [refreshFromCloud, refreshLocal],
  )

  const summaries = tournaments.map((t) => toSummary(t))

  return {
    tournaments,
    summaries,
    loading,
    syncError,
    isCloudEnabled: isSupabaseConfigured,
    create,
    update,
    updateFromDraft,
    remove,
    refresh: refreshFromCloud,
    configToDraft,
  }
}
