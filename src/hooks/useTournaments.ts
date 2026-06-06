import { useCallback, useState } from 'react'
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
import { isSupabaseConfigured } from '../lib/supabase'
import { upsertManyResults } from '../services/resultsService'

export function useTournaments() {
  const [tournaments, setTournaments] = useState<TournamentConfig[]>(() => listTournaments())

  const refresh = useCallback(() => {
    setTournaments(listTournaments())
  }, [])

  const create = useCallback(
    (draft: CreateTournamentDraft) => {
      const config = buildTournamentFromDraft(draft)
      saveTournament(config)
      refresh()
      return config
    },
    [refresh],
  )

  const update = useCallback(
    (config: TournamentConfig) => {
      saveTournament({ ...config, updatedAt: new Date().toISOString() })
      refresh()
    },
    [refresh],
  )

  const updateFromDraft = useCallback(
    (id: string, draft: CreateTournamentDraft) => {
      const existing = getTournament(id)
      if (!existing) return null
      const config = updateTournamentFromDraft(existing, draft)
      refresh()

      if (isSupabaseConfigured) {
        const results = loadRawResults(id)
        if (Object.keys(results).length > 0) {
          upsertManyResults(results).catch(() => {})
        }
      }

      return config
    },
    [refresh],
  )

  const remove = useCallback(
    (id: string) => {
      const ok = deleteTournament(id)
      if (ok) refresh()
      return ok
    },
    [refresh],
  )

  const summaries = tournaments.map((t) => toSummary(t))

  return {
    tournaments,
    summaries,
    create,
    update,
    updateFromDraft,
    remove,
    refresh,
    configToDraft,
  }
}
