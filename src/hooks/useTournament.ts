import { useCallback, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  deleteResult,
  fetchResultsForTournament,
  upsertManyResults,
  upsertResult,
} from '../services/resultsService'
import { resultsStorageKey } from '../services/tournamentStorage'
import type { TournamentRuntime } from '../tournament/runtime'
import type { GameScore, Result } from '../types'
import { computeResult, repairStoredResults } from '../utils/scoring'
import {
  getAllMatches,
  getPodium,
  isGroupStageComplete,
  isTournamentComplete,
} from '../utils/standings'

function resultsMigratedKey(tournamentId: string): string {
  return `ttt-results-migrated-${tournamentId}`
}

function loadLocalResults(key: string): Record<string, Result> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, Result>
  } catch {
    return {}
  }
}

function saveLocalResults(key: string, results: Record<string, Result>) {
  localStorage.setItem(key, JSON.stringify(results))
}

function applyResultRepairs(
  runtime: TournamentRuntime,
  raw: Record<string, Result>,
  storageKey: string,
): Record<string, Result> {
  const { results, changed } = repairStoredResults(runtime, raw)
  if (changed) saveLocalResults(storageKey, results)
  return results
}

export function useTournament(runtime: TournamentRuntime) {
  const tournamentId = runtime.config.id
  const storageKey = resultsStorageKey(tournamentId)
  const [results, setResults] = useState<Record<string, Result>>({})
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setResults(applyResultRepairs(runtime, loadLocalResults(storageKey), storageKey))
      setLoading(false)
      return
    }

    let cancelled = false

    async function init() {
      try {
        setSyncError(null)
        let remote = await fetchResultsForTournament(tournamentId)

        const local = loadLocalResults(storageKey)
        const hasLocal = Object.keys(local).length > 0
        const hasRemote = Object.keys(remote).length > 0
        const alreadyMigrated = localStorage.getItem(resultsMigratedKey(tournamentId)) === '1'

        if (hasLocal && !hasRemote && !alreadyMigrated) {
          await upsertManyResults(tournamentId, local)
          remote = local
          localStorage.setItem(resultsMigratedKey(tournamentId), '1')
          saveLocalResults(storageKey, local)
        }

        if (!cancelled) {
          const { results: repaired, changed } = repairStoredResults(runtime, remote)
          setResults(repaired)
          saveLocalResults(storageKey, repaired)
          if (changed) {
            upsertManyResults(tournamentId, repaired).catch(() => {})
          }
        }
      } catch (e) {
        if (!cancelled) {
          setSyncError(e instanceof Error ? e.message : 'Failed to sync scores')
          setResults(applyResultRepairs(runtime, loadLocalResults(storageKey), storageKey))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void init()

    if (!supabase) return

    const client = supabase
    const channel = client
      .channel(`match-results-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_results',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as { match_id?: string }
            if (old.match_id) {
              setResults((prev) => {
                const next = { ...prev }
                delete next[old.match_id!]
                saveLocalResults(storageKey, next)
                return next
              })
            }
            return
          }

          const row = payload.new as { match_id?: string; result?: Result }
          if (row.match_id && row.result) {
            setResults((prev) => {
              const next = applyResultRepairs(
                runtime,
                { ...prev, [row.match_id!]: row.result! },
                storageKey,
              )
              saveLocalResults(storageKey, next)
              return next
            })
          }
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  }, [runtime, storageKey, tournamentId])

  const matches = useMemo(() => getAllMatches(runtime, results), [runtime, results])
  const groupStageComplete = useMemo(
    () => isGroupStageComplete(runtime, results),
    [runtime, results],
  )
  const tournamentComplete = useMemo(
    () => isTournamentComplete(runtime, matches, results),
    [runtime, matches, results],
  )
  const podium = useMemo(
    () => (tournamentComplete ? getPodium(results, matches) : null),
    [tournamentComplete, results, matches],
  )

  const saveResult = useCallback(
    (
      matchId: string,
      player1Id: string,
      player2Id: string,
      g1: GameScore,
      g2: GameScore,
      g3: GameScore | null,
      isAdmin = true,
      isKnockout = false,
    ) => {
      if (!isAdmin) return false
      const result = computeResult(
        player1Id,
        player2Id,
        g1,
        g2,
        g3,
        isKnockout,
        runtime.config.scoringRules,
      )
      if (!result) return false

      setResults((prev) => {
        const next = { ...prev, [matchId]: result }
        saveLocalResults(storageKey, next)
        return next
      })

      if (!isSupabaseConfigured) return true

      upsertResult(tournamentId, matchId, result).then(
        () => setSyncError(null),
        (e) => {
          setSyncError(e instanceof Error ? e.message : 'Failed to save score')
          setResults((prev) => {
            const next = { ...prev }
            delete next[matchId]
            saveLocalResults(storageKey, next)
            return next
          })
        },
      )

      return true
    },
    [runtime, storageKey, tournamentId],
  )

  const clearResult = useCallback(
    (matchId: string) => {
      setResults((prev) => {
        const next = { ...prev }
        delete next[matchId]
        saveLocalResults(storageKey, next)
        return next
      })

      if (!isSupabaseConfigured) return

      deleteResult(tournamentId, matchId).catch((e) => {
        setSyncError(e instanceof Error ? e.message : 'Failed to clear score')
      })
    },
    [storageKey, tournamentId],
  )

  return {
    results,
    matches,
    groupStageComplete,
    tournamentComplete,
    podium,
    loading,
    syncError,
    isCloudEnabled: isSupabaseConfigured,
    saveResult,
    clearResult,
  }
}
