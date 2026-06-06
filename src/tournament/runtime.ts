import type { Match, Player, Tab } from '../types'
import type {
  TournamentConfig,
  TournamentFormat,
  TournamentStatus,
} from '../types/tournament'
import { createDefaultScoringRules } from './defaults'
import { formatLocalDateIso } from './scheduleDays'

export interface TournamentRuntime {
  config: TournamentConfig
  players: Player[]
  playerMap: Record<string, Player>
  groupPlayerOrder: Record<string, readonly string[]>
  groupMatches: Match[]
  getPlayerName: (id: string) => string
  getGroupIds: () => string[]
}

export function createPlayerMap(players: Player[]): Record<string, Player> {
  return Object.fromEntries(players.map((p) => [p.id, p]))
}

export function createGroupPlayerOrder(
  config: TournamentConfig,
): Record<string, readonly string[]> {
  if (config.groupConfig?.assignments) {
    return config.groupConfig.assignments
  }

  const byGroup: Record<string, string[]> = {}
  for (const p of config.players) {
    if (!byGroup[p.group]) byGroup[p.group] = []
    byGroup[p.group].push(p.id)
  }
  return byGroup
}

export function createRuntime(config: TournamentConfig): TournamentRuntime {
  const playerMap = createPlayerMap(config.players)

  return {
    config,
    players: config.players,
    playerMap,
    groupPlayerOrder: createGroupPlayerOrder(config),
    groupMatches: config.groupMatches,
    getPlayerName: (id) => playerMap[id]?.name ?? id,
    getGroupIds: () => {
      if (config.groupConfig?.groupIds?.length) return config.groupConfig.groupIds
      return Object.keys(createGroupPlayerOrder(config))
    },
  }
}

export function getVisibleTabs(format: TournamentFormat): Tab[] {
  switch (format) {
    case 'round_robin':
      return ['schedule', 'standings', 'players']
    case 'group_knockout':
      return ['schedule', 'standings', 'bracket', 'players']
    case 'single_elimination':
    case 'double_elimination':
      return ['schedule', 'bracket', 'players']
    case 'swiss':
      return ['schedule', 'standings', 'players']
    case 'custom':
      return ['schedule', 'standings', 'bracket', 'players']
    default:
      return ['schedule', 'standings', 'bracket', 'players']
  }
}

export function computeTournamentStatus(
  config: Pick<TournamentConfig, 'startDate' | 'endDate'>,
  tournamentComplete = false,
): TournamentStatus {
  if (tournamentComplete) return 'completed'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(config.startDate + 'T00:00:00')
  const end = new Date(config.endDate + 'T00:00:00')

  if (today < start) return 'upcoming'
  if (today > end) return 'completed'
  return 'active'
}

export function createEmptyDraft(): import('../types/tournament').CreateTournamentDraft {
  const today = new Date()
  const end = new Date(today)
  end.setDate(end.getDate() + 5)

  return {
    name: '',
    description: '',
    imageUrl: null,
    sportType: 'Table Tennis',
    startDate: formatLocalDateIso(today),
    endDate: formatLocalDateIso(end),
    participantType: 'individual',
    participantCount: 8,
    playerNames: Array.from({ length: 8 }, (_, i) => `Player ${i + 1}`),
    format: 'group_knockout',
    seeding: 'random',
    groupCount: 2,
    playersPerGroup: 4,
    autoBalanceGroups: true,
    groupAssignments: {},
    qualificationRule: 'top_2',
    topNPerGroup: 2,
    matchFormat: 'best_of_3',
    scoringRules: createDefaultScoringRules('best_of_3'),
    tiebreakers: ['total_points', 'score_difference', 'head_to_head', 'total_wins', 'seed_ranking'],
  }
}
