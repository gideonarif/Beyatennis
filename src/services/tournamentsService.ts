import { supabase } from '../lib/supabase'
import type { TournamentConfig } from '../types/tournament'

export async function fetchAllTournaments(): Promise<TournamentConfig[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('tournaments')
    .select('config, updated_at')
    .order('updated_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => row.config as TournamentConfig)
}

export async function upsertTournament(config: TournamentConfig): Promise<void> {
  if (!supabase) return

  const { error } = await supabase.from('tournaments').upsert({
    id: config.id,
    config,
    updated_at: config.updatedAt || new Date().toISOString(),
  })

  if (error) throw error
}

export async function upsertManyTournaments(configs: TournamentConfig[]): Promise<void> {
  if (!supabase || configs.length === 0) return

  const rows = configs.map((config) => ({
    id: config.id,
    config,
    updated_at: config.updatedAt || new Date().toISOString(),
  }))

  const { error } = await supabase.from('tournaments').upsert(rows)
  if (error) throw error
}

export async function deleteTournamentRemote(id: string): Promise<void> {
  if (!supabase) return

  const { error } = await supabase.from('tournaments').delete().eq('id', id)
  if (error) throw error
}
