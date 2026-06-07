import { supabase } from '../lib/supabase'
import type { Result } from '../types'

export async function fetchResultsForTournament(
  tournamentId: string,
): Promise<Record<string, Result>> {
  if (!supabase) return {}

  const { data, error } = await supabase
    .from('match_results')
    .select('match_id, result, tournament_id')
    .eq('tournament_id', tournamentId)

  if (error) throw error

  const map: Record<string, Result> = {}
  for (const row of data ?? []) {
    map[row.match_id] = row.result as Result
  }
  return map
}

export async function upsertResult(
  tournamentId: string,
  matchId: string,
  result: Result,
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase.from('match_results').upsert({
    match_id: matchId,
    tournament_id: tournamentId,
    result,
    updated_at: new Date().toISOString(),
  })

  if (error) throw error
}

export async function deleteResult(tournamentId: string, matchId: string): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('match_results')
    .delete()
    .eq('match_id', matchId)
    .eq('tournament_id', tournamentId)

  if (error) throw error
}

export async function upsertManyResults(
  tournamentId: string,
  results: Record<string, Result>,
): Promise<void> {
  if (!supabase || Object.keys(results).length === 0) return

  const rows = Object.entries(results).map(([match_id, result]) => ({
    match_id,
    tournament_id: tournamentId,
    result,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('match_results').upsert(rows)
  if (error) throw error
}

export async function deleteResultsForTournament(tournamentId: string): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('match_results')
    .delete()
    .eq('tournament_id', tournamentId)

  if (error) throw error
}
