import type {
  MatchFormat,
  PointsRule,
  ScoringRulesConfig,
  TiebreakerCriterion,
} from '../types/tournament'

export const DEFAULT_TIEBREAKERS: TiebreakerCriterion[] = [
  'total_points',
  'score_difference',
  'head_to_head',
  'total_wins',
  'seed_ranking',
]

export const DEFAULT_POINTS_RULES: PointsRule[] = [
  {
    id: 'sweep',
    label: 'Straight Win (2-0)',
    condition: 'sweep',
    winnerPoints: 3,
    loserPoints: 0,
  },
  {
    id: 'decider',
    label: 'Deciding Match Win (2-1)',
    condition: 'decider',
    winnerPoints: 2,
    loserPoints: 1,
  },
]

export function gamesToWinFromFormat(format: MatchFormat): number {
  switch (format) {
    case 'best_of_1':
      return 1
    case 'best_of_3':
      return 2
    case 'best_of_5':
      return 3
    case 'best_of_7':
      return 4
    default:
      return 2
  }
}

export function createDefaultScoringRules(matchFormat: MatchFormat = 'best_of_3'): ScoringRulesConfig {
  return {
    pointsPerGame: 21,
    deuceAt: 20,
    winBy: 2,
    gamesToWin: gamesToWinFromFormat(matchFormat),
    pointsRules: DEFAULT_POINTS_RULES.map((r) => ({ ...r })),
  }
}

export function getRankingPoints(
  rules: ScoringRulesConfig,
  wentToDecider: boolean,
  isWinner: boolean,
): number {
  const condition = wentToDecider ? 'decider' : 'sweep'
  const rule = rules.pointsRules.find((r) => r.condition === condition)
  if (!rule) return isWinner ? 3 : 0
  return isWinner ? rule.winnerPoints : rule.loserPoints
}
