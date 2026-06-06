import type { Result } from '../types'
import type { CreateTournamentDraft, TournamentConfig, TournamentSummary } from '../types/tournament'
import { createSeedTournament, SEED_END, SEED_START, SEED_TOURNAMENT_ID } from '../data/seedTournament'
import {
  regenerateSchedule,
  remapResultsToSchedule,
  scheduleNeedsRegeneration,
  updateTournamentWithSchedule,
} from '../tournament/builder'
import { computeTournamentStatus } from '../tournament/runtime'
import {
  lockDraftDates,
  tournamentHasStarted,
  updateStartedTournamentMetadata,
} from '../tournament/tournamentLifecycle'

const STORAGE_KEY = 'ttt-tournaments-v1'
const LEGACY_RESULTS_KEY = 'ttt-tournament-v1'
const MIGRATED_KEY = 'ttt-migrated-legacy-results'

function loadAllRaw(): TournamentConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [createSeedTournament()]
    const parsed = JSON.parse(raw) as TournamentConfig[]
    if (!Array.isArray(parsed) || parsed.length === 0) return [createSeedTournament()]
    return parsed
  } catch {
    return [createSeedTournament()]
  }
}

function saveAll(tournaments: TournamentConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments))
}

export function loadRawResults(tournamentId: string): Record<string, Result> {
  try {
    const raw = localStorage.getItem(resultsStorageKey(tournamentId))
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, Result>
  } catch {
    return {}
  }
}

export function saveRawResults(tournamentId: string, results: Record<string, Result>) {
  localStorage.setItem(resultsStorageKey(tournamentId), JSON.stringify(results))
}

export function hasTournamentStarted(tournamentId: string): boolean {
  return tournamentHasStarted(loadRawResults(tournamentId))
}

function migrateLegacyResults() {
  if (localStorage.getItem(MIGRATED_KEY) === '1') return
  const legacy = localStorage.getItem(LEGACY_RESULTS_KEY)
  if (!legacy) {
    localStorage.setItem(MIGRATED_KEY, '1')
    return
  }
  localStorage.setItem(`ttt-results-v1-${SEED_TOURNAMENT_ID}`, legacy)
  localStorage.setItem(MIGRATED_KEY, '1')
}

function seedWasMigratedToIsoDates(tournament: TournamentConfig): boolean {
  return tournament.scheduleDays.some((day) => /^\d{4}-\d{2}-\d{2}$/.test(day))
}

function ensureSeedKnockoutOnSunday(tournament: TournamentConfig): TournamentConfig {
  if (tournament.scheduleDays.includes('Sun')) return tournament
  return { ...tournament, scheduleDays: [...tournament.scheduleDays, 'Sun'] }
}

function syncSeedDates(tournament: TournamentConfig): TournamentConfig {
  let next = tournament
  if (tournament.startDate !== SEED_START || tournament.endDate !== SEED_END) {
    next = { ...next, startDate: SEED_START, endDate: SEED_END }
  }
  return ensureSeedKnockoutOnSunday(next)
}

/** Restore Hawassa to the canonical legacy schedule and remap stored scores. */
function restoreSeedTournament(tournament: TournamentConfig): TournamentConfig {
  const canonical = createSeedTournament()
  const results = loadRawResults(SEED_TOURNAMENT_ID)
  if (Object.keys(results).length > 0) {
    saveRawResults(
      SEED_TOURNAMENT_ID,
      remapResultsToSchedule(tournament.groupMatches, canonical.groupMatches, results),
    )
  }
  return canonical
}

function ensureFreshSchedule(config: TournamentConfig): TournamentConfig {
  if (config.id === SEED_TOURNAMENT_ID) return config
  if (hasTournamentStarted(config.id)) return config
  if (!scheduleNeedsRegeneration(config)) return config
  return regenerateSchedule(config)
}

function repairMissingSchedules(tournaments: TournamentConfig[]): TournamentConfig[] {
  let changed = false
  const repaired = tournaments.map((tournament) => {
    if (tournament.id === SEED_TOURNAMENT_ID) {
      if (seedWasMigratedToIsoDates(tournament)) {
        changed = true
        return restoreSeedTournament(tournament)
      }
      const synced = syncSeedDates(tournament)
      if (synced !== tournament) {
        changed = true
        return synced
      }
      return tournament
    }

    if (hasTournamentStarted(tournament.id)) return tournament
    if (!scheduleNeedsRegeneration(tournament)) return tournament

    changed = true
    const results = loadRawResults(tournament.id)
    const fresh = regenerateSchedule(tournament)
    if (Object.keys(results).length > 0) {
      saveRawResults(
        tournament.id,
        remapResultsToSchedule(tournament.groupMatches, fresh.groupMatches, results),
      )
    }
    return fresh
  })
  if (changed) saveAll(repaired)
  return repaired
}

export function initTournamentStorage(): TournamentConfig[] {
  migrateLegacyResults()
  let tournaments = loadAllRaw()
  if (!tournaments.some((t) => t.id === SEED_TOURNAMENT_ID)) {
    tournaments.unshift(createSeedTournament())
    saveAll(tournaments)
  }
  return repairMissingSchedules(tournaments)
}

export function listTournaments(): TournamentConfig[] {
  return initTournamentStorage()
}

export function getTournament(id: string): TournamentConfig | undefined {
  return listTournaments().find((t) => t.id === id)
}

export function saveTournament(config: TournamentConfig) {
  const fresh = ensureFreshSchedule(config)
  const all = loadAllRaw()
  const idx = all.findIndex((t) => t.id === fresh.id)
  const next = [...all]
  if (idx >= 0) next[idx] = fresh
  else next.unshift(fresh)
  saveAll(next)
}

export function updateTournamentFromDraft(
  existing: TournamentConfig,
  draft: CreateTournamentDraft,
): TournamentConfig {
  const results = loadRawResults(existing.id)
  const started = tournamentHasStarted(results)

  if (started) {
    const safeDraft = lockDraftDates(existing, draft, true)
    const config = updateStartedTournamentMetadata(existing, safeDraft)
    saveTournament(config)
    return config
  }

  const { config, results: remappedResults } = updateTournamentWithSchedule(
    existing,
    draft,
    results,
  )
  saveRawResults(existing.id, remappedResults)
  saveTournament(config)
  return config
}

export function deleteTournament(id: string): boolean {
  if (id === SEED_TOURNAMENT_ID) return false
  const all = loadAllRaw().filter((t) => t.id !== id)
  saveAll(all)
  localStorage.removeItem(`ttt-results-v1-${id}`)
  return true
}

export function toSummary(
  config: TournamentConfig,
  tournamentComplete = false,
): TournamentSummary {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    imageUrl: config.imageUrl,
    sportType: config.sportType,
    startDate: config.startDate,
    endDate: config.endDate,
    format: config.format,
    status: computeTournamentStatus(config, tournamentComplete),
    playerCount: config.players.length,
  }
}

export function resultsStorageKey(tournamentId: string): string {
  return `ttt-results-v1-${tournamentId}`
}
