import { createSeedTournament, SEED_TOURNAMENT_ID } from '../data/seedTournament'
import { isSupabaseConfigured } from '../lib/supabase'
import type { TournamentConfig } from '../types/tournament'
import { initTournamentStorage, replaceAllTournaments } from './tournamentStorage'
import {
  fetchAllTournaments,
  upsertManyTournaments,
} from './tournamentsService'

const MIGRATED_KEY = 'ttt-tournaments-migrated-to-supabase'

function mergeByUpdatedAt(
  local: TournamentConfig[],
  remote: TournamentConfig[],
): TournamentConfig[] {
  const byId = new Map<string, TournamentConfig>()

  for (const tournament of [...remote, ...local]) {
    const existing = byId.get(tournament.id)
    if (
      !existing ||
      new Date(tournament.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()
    ) {
      byId.set(tournament.id, tournament)
    }
  }

  if (!byId.has(SEED_TOURNAMENT_ID)) {
    byId.set(SEED_TOURNAMENT_ID, createSeedTournament())
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

function tournamentsNeedUpload(
  local: TournamentConfig[],
  remote: TournamentConfig[],
): TournamentConfig[] {
  const remoteById = new Map(remote.map((t) => [t.id, t]))
  return local.filter((tournament) => {
    const remoteCopy = remoteById.get(tournament.id)
    if (!remoteCopy) return true
    return (
      new Date(tournament.updatedAt).getTime() >
      new Date(remoteCopy.updatedAt).getTime()
    )
  })
}

/** Merge local and cloud tournaments, upload changes, and persist locally. */
export async function syncTournamentsWithCloud(): Promise<TournamentConfig[]> {
  const local = initTournamentStorage()

  if (!isSupabaseConfigured) return local

  const remote = await fetchAllTournaments()
  const alreadyMigrated = localStorage.getItem(MIGRATED_KEY) === '1'

  if (!alreadyMigrated && local.length > 0) {
    await upsertManyTournaments(local)
    localStorage.setItem(MIGRATED_KEY, '1')
  } else {
    const toUpload = tournamentsNeedUpload(local, remote)
    if (toUpload.length > 0) {
      await upsertManyTournaments(toUpload)
    }
  }

  const merged = mergeByUpdatedAt(local, remote)
  return replaceAllTournaments(merged)
}
