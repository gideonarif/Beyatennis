import { GROUP_MATCHES, DAYS } from '../data/schedule'
import { GROUP_PLAYER_ORDER, PLAYERS } from '../data/players'
import type { TournamentConfig } from '../types/tournament'
import { createDefaultScoringRules } from '../tournament/defaults'

export const SEED_TOURNAMENT_ID = 'hawassa-open-2026'

export const SEED_START = '2026-06-02'
export const SEED_END = '2026-06-07'

/** Calendar date for each legacy weekday tab (Jun 2 Tue → Jun 7 Sun). */
export const SEED_WEEKDAY_DATES: Record<string, string> = {
  Tue: SEED_START,
  Wed: '2026-06-03',
  Thu: '2026-06-04',
  Fri: '2026-06-05',
  Sat: '2026-06-06',
  Sun: SEED_END,
}

export function createSeedTournament(): TournamentConfig {
  const now = new Date().toISOString()

  return {
    id: SEED_TOURNAMENT_ID,
    name: 'Hawassa Open Table Tennis Championship',
    description: 'Group stage followed by knockout semifinals, third-place match, and final.',
    imageUrl: null,
    sportType: 'Table Tennis',
    startDate: SEED_START,
    endDate: SEED_END,
    format: 'group_knockout',
    participantType: 'individual',
    seeding: 'manual',
    groupConfig: {
      groupIds: ['A', 'B'],
      assignments: {
        A: [...GROUP_PLAYER_ORDER.A],
        B: [...GROUP_PLAYER_ORDER.B],
      },
      autoBalance: false,
    },
    qualification: {
      rule: 'top_2',
      topNPerGroup: 2,
      knockoutPairing: 'cross',
    },
    matchFormat: 'best_of_3',
    scoringRules: createDefaultScoringRules('best_of_3'),
    tiebreakers: [
      'total_points',
      'score_difference',
      'head_to_head',
      'total_wins',
      'seed_ranking',
    ],
    players: [...PLAYERS],
    groupMatches: [...GROUP_MATCHES],
    // Tue–Sat group stage; Sun is knockout day (semis, 3rd place, final).
    scheduleDays: [...DAYS],
    createdAt: now,
    updatedAt: now,
  }
}
