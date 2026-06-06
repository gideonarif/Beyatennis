import type { Day, Match, Player } from '../types'

export type TournamentFormat =
  | 'round_robin'
  | 'group_knockout'
  | 'single_elimination'
  | 'double_elimination'
  | 'swiss'
  | 'custom'

export type TournamentStatus = 'upcoming' | 'active' | 'completed'

export type ParticipantType = 'individual' | 'team'

export type SeedingRule = 'random' | 'manual' | 'previous_ranking' | 'rating'

export type QualificationRule =
  | 'top_1'
  | 'top_2'
  | 'top_3'
  | 'best_runners_up'
  | 'custom'

export type MatchFormat = 'best_of_1' | 'best_of_3' | 'best_of_5' | 'best_of_7'

export type TiebreakerCriterion =
  | 'total_points'
  | 'head_to_head'
  | 'match_difference'
  | 'game_difference'
  | 'score_difference'
  | 'total_wins'
  | 'seed_ranking'

export type PointsCondition = 'sweep' | 'decider' | 'win' | 'loss' | 'draw'

export interface PointsRule {
  id: string
  label: string
  condition: PointsCondition
  winnerPoints: number
  loserPoints: number
}

export interface ScoringRulesConfig {
  pointsPerGame: number
  deuceAt: number
  winBy: number
  gamesToWin: number
  pointsRules: PointsRule[]
}

export interface GroupConfig {
  groupIds: string[]
  assignments: Record<string, string[]>
  autoBalance: boolean
}

export interface QualificationConfig {
  rule: QualificationRule
  topNPerGroup: number
  knockoutPairing: 'cross' | 'standard'
}

export interface TournamentConfig {
  id: string
  name: string
  description: string
  imageUrl: string | null
  sportType: string
  startDate: string
  endDate: string
  format: TournamentFormat
  participantType: ParticipantType
  seeding: SeedingRule
  groupConfig?: GroupConfig
  qualification?: QualificationConfig
  matchFormat: MatchFormat
  scoringRules: ScoringRulesConfig
  tiebreakers: TiebreakerCriterion[]
  players: Player[]
  groupMatches: Match[]
  scheduleDays: Day[]
  createdAt: string
  updatedAt: string
}

export interface TournamentSummary extends Pick<
  TournamentConfig,
  | 'id'
  | 'name'
  | 'description'
  | 'imageUrl'
  | 'sportType'
  | 'startDate'
  | 'endDate'
  | 'format'
> {
  status: TournamentStatus
  playerCount: number
}

export interface CreateTournamentDraft {
  name: string
  description: string
  imageUrl: string | null
  sportType: string
  startDate: string
  endDate: string
  participantType: ParticipantType
  participantCount: number
  playerNames: string[]
  format: TournamentFormat
  seeding: SeedingRule
  groupCount: number
  playersPerGroup: number
  autoBalanceGroups: boolean
  groupAssignments: Record<string, string[]>
  qualificationRule: QualificationRule
  topNPerGroup: number
  matchFormat: MatchFormat
  scoringRules: ScoringRulesConfig
  tiebreakers: TiebreakerCriterion[]
}

export const FORMAT_LABELS: Record<TournamentFormat, string> = {
  round_robin: 'Round Robin',
  group_knockout: 'Group Stage + Knockout',
  single_elimination: 'Single Elimination',
  double_elimination: 'Double Elimination',
  swiss: 'Swiss System',
  custom: 'Custom Format',
}

export const TIEBREAKER_LABELS: Record<TiebreakerCriterion, string> = {
  total_points: 'Total Points',
  head_to_head: 'Head-to-Head',
  match_difference: 'Match Difference',
  game_difference: 'Game Difference',
  score_difference: 'Score Difference',
  total_wins: 'Total Wins',
  seed_ranking: 'Seed Ranking',
}
