import { supabase } from '../lib/supabase'
import { SEED_TOURNAMENT_ID } from '../data/seedTournament'
import type { Result } from '../types'
import { isTournamentIdColumnMissing } from './cloudErrors'

async function fetchLegacyResults(): Promise<Record<string, Result>> {
  if (!supabase) return {}

  const { data, error } = await supabase
    .from('match_results')
    .select('match_id, result')

  if (error) throw error

  const map: Record<string, Result> = {}
  for (const row of data ?? []) {
    map[row.match_id] = row.result as Result
  }
  return map
}

export async function fetchResultsForTournament(
  tournamentId: string,
): Promise<Record<string, Result>> {
  if (!supabase) return {}

  const { data, error } = await supabase
    .from('match_results')
    .select('match_id, result, tournament_id')
    .eq('tournament_id', tournamentId)

  if (error) {
    if (isTournamentIdColumnMissing(error)) {
      if (tournamentId === SEED_TOURNAMENT_ID) return fetchLegacyResults()
      return {}
    }
    throw error
  }

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

  const row = {
    match_id: matchId,
    tournament_id: tournamentId,
    result,
    updated_at: new Date().toISOString(),
  }

  let { error } = await supabase.from('match_results').upsert(row)

  if (error && isTournamentIdColumnMissing(error)) {
    if (tournamentId !== SEED_TOURNAMENT_ID) return
    ;({ error } = await supabase.from('match_results').upsert({
      match_id: matchId,
      result,
      updated_at: new Date().toISOString(),
    }))
  }

  if (error) throw error
}

export async function deleteResult(tournamentId: string, matchId: string): Promise<void> {
  if (!supabase) return

  let { error } = await supabase
    .from('match_results')
    .delete()
    .eq('match_id', matchId)
    .eq('tournament_id', tournamentId)

  if (error && isTournamentIdColumnMissing(error)) {
    if (tournamentId !== SEED_TOURNAMENT_ID) return
    ;({ error } = await supabase.from('match_results').delete().eq('match_id', matchId))
  }

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

  let { error } = await supabase.from('match_results').upsert(rows)

  if (error && isTournamentIdColumnMissing(error)) {
    if (tournamentId !== SEED_TOURNAMENT_ID) return
    const legacyRows = Object.entries(results).map(([match_id, result]) => ({
      match_id,
      result,
      updated_at: new Date().toISOString(),
    }))
    ;({ error } = await supabase.from('match_results').upsert(legacyRows))
  }

  if (error) throw error
}

export async function deleteResultsForTournament(tournamentId: string): Promise<void> {
  if (!supabase) return

  let { error } = await supabase
    .from('match_results')
    .delete()
    .eq('tournament_id', tournamentId)

  if (error && isTournamentIdColumnMissing(error)) {
    if (tournamentId !== SEED_TOURNAMENT_ID) return
    return
  }

  if (error) throw error
}
