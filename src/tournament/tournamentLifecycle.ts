import type { Result } from '../types'
import type { CreateTournamentDraft, TournamentConfig } from '../types/tournament'

export function tournamentHasStarted(results: Record<string, Result>): boolean {
  return Object.keys(results).length > 0
}

/** Strip date changes from a draft when the tournament is already in play. */
export function lockDraftDates(
  existing: Pick<TournamentConfig, 'startDate' | 'endDate'>,
  draft: CreateTournamentDraft,
  started: boolean,
): CreateTournamentDraft {
  if (!started) return draft
  return {
    ...draft,
    startDate: existing.startDate,
    endDate: existing.endDate,
  }
}

/** Safe metadata-only update while matches are underway. */
export function updateStartedTournamentMetadata(
  existing: TournamentConfig,
  draft: CreateTournamentDraft,
): TournamentConfig {
  return {
    ...existing,
    name: draft.name.trim() || existing.name,
    description: draft.description,
    imageUrl: draft.imageUrl,
    sportType: draft.sportType,
    scoringRules: draft.scoringRules,
    tiebreakers: [...draft.tiebreakers],
    updatedAt: new Date().toISOString(),
  }
}
