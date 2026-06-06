import type { Match, Result } from '../types'
import type { TournamentConfig } from '../types/tournament'
import { scheduleDaysMismatch } from './scheduleDays'

export function matchupKey(p1: string, p2: string): string {
  return [p1, p2].sort().join('|')
}

/** Group-stage matches assigned to days outside the current schedule. */
export function matchesUseStaleDays(config: TournamentConfig): boolean {
  if (config.groupMatches.length === 0) return false
  const validDays = new Set(config.scheduleDays)
  return config.groupMatches.some(
    (match) => match.group !== 'Knockout' && !validDays.has(match.day),
  )
}

/** Carry scored results onto the new fixture list after a reschedule (same player pairs). */
export function remapResultsToSchedule(
  previousMatches: Match[],
  nextMatches: Match[],
  results: Record<string, Result>,
): Record<string, Result> {
  if (Object.keys(results).length === 0) return results

  const resultByPair = new Map<string, Result>()
  for (const match of previousMatches) {
    const stored = results[match.id]
    if (stored) {
      resultByPair.set(matchupKey(match.player1Id, match.player2Id), stored)
    }
  }

  const remapped: Record<string, Result> = {}
  for (const match of nextMatches) {
    const stored = resultByPair.get(matchupKey(match.player1Id, match.player2Id))
    if (stored) remapped[match.id] = stored
  }

  return remapped
}

export function scheduleNeedsRegeneration(
  config: TournamentConfig,
  exceedsDailyCap: (matches: Match[]) => boolean,
  started = false,
): boolean {
  if (started) return false
  if (config.players.length < 2) return false
  if (config.groupMatches.length === 0) return true
  if (exceedsDailyCap(config.groupMatches)) return true
  if (scheduleDaysMismatch(config)) return true
  if (matchesUseStaleDays(config)) return true
  return false
}

export function datesChanged(
  config: Pick<TournamentConfig, 'startDate' | 'endDate'>,
  draft: Pick<{ startDate: string; endDate: string }, 'startDate' | 'endDate'>,
): boolean {
  return config.startDate !== draft.startDate || config.endDate !== draft.endDate
}
