import { useCallback, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  deleteResult,
  fetchAllResults,
  upsertManyResults,
  upsertResult,
} from '../services/resultsService'
import type { GameScore, Result } from '../types'
import { computeResult, repairStoredResults } from '../utils/scoring'
import {
  getAllMatches,
  getPodium,
  isGroupStageComplete,
  isTournamentComplete,
} from '../utils/standings'

const STORAGE_KEY = 'ttt-tournament-v1'
const MIGRATED_KEY = 'ttt-migrated-to-supabase'

function loadLocalResults(): Record<string, Result> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, Result>
  } catch {
    return {}
  }
}

function saveLocalResults(results: Record<string, Result>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results))
}

function applyResultRepairs(raw: Record<string, Result>): Record<string, Result> {
  const { results, changed } = repairStoredResults(raw)
  if (changed) saveLocalResults(results)
  return results
}

export function useTournament() {
  const [results, setResults] = useState<Record<string, Result>>({})
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setResults(applyResultRepairs(loadLocalResults()))
      setLoading(false)
      return
    }

    let cancelled = false

    async function init() {
      try {
        setSyncError(null)
        let remote = await fetchAllResults()

        const local = loadLocalResults()
        const hasLocal = Object.keys(local).length > 0
        const hasRemote = Object.keys(remote).length > 0
        const alreadyMigrated = localStorage.getItem(MIGRATED_KEY) === '1'

        if (hasLocal && !hasRemote && !alreadyMigrated) {
          await upsertManyResults(local)
          remote = local
          localStorage.setItem(MIGRATED_KEY, '1')
          saveLocalResults(local)
        }

        if (!cancelled) {
          const { results: repaired, changed } = repairStoredResults(remote)
          setResults(repaired)
          if (changed) {
            saveLocalResults(repaired)
            upsertManyResults(repaired).catch(() => {})
          }
        }
      } catch (e) {
        if (!cancelled) {
          setSyncError(e instanceof Error ? e.message : 'Failed to sync scores')
          setResults(applyResultRepairs(loadLocalResults()))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    if (!supabase) return

    const channel = supabase
      .channel('match-results')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_results' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as { match_id?: string }
            if (old.match_id) {
              setResults((prev) => {
                const next = { ...prev }
                delete next[old.match_id!]
                return next
              })
            }
            return
          }

          const row = payload.new as { match_id?: string; result?: Result }
          if (row.match_id && row.result) {
            setResults((prev) =>
              applyResultRepairs({ ...prev, [row.match_id!]: row.result! }),
            )
          }
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase?.removeChannel(channel)
    }
  }, [])

  const matches = useMemo(() => getAllMatches(results), [results])
  const groupStageComplete = useMemo(() => isGroupStageComplete(results), [results])
  const tournamentComplete = useMemo(
    () => isTournamentComplete(matches, results),
    [matches, results],
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
      const result = computeResult(player1Id, player2Id, g1, g2, g3, isKnockout)
      if (!result) return false

      setResults((prev) => {
        const next = { ...prev, [matchId]: result }
        saveLocalResults(next)
        return next
      })

      if (!isSupabaseConfigured) return true

      upsertResult(matchId, result).then(
        () => setSyncError(null),
        (e) => {
          setSyncError(e instanceof Error ? e.message : 'Failed to save score')
          setResults((prev) => {
            const next = { ...prev }
            delete next[matchId]
            saveLocalResults(next)
            return next
          })
        },
      )

      return true
    },
    [],
  )

  const clearResult = useCallback((matchId: string) => {
    setResults((prev) => {
      const next = { ...prev }
      delete next[matchId]
      saveLocalResults(next)
      return next
    })

    if (!isSupabaseConfigured) return

    deleteResult(matchId).catch((e) => {
      setSyncError(e instanceof Error ? e.message : 'Failed to clear score')
    })
  }, [])

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
