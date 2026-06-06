export type Day = string
export type Group = string
export type Stage = 'group' | 'semifinal' | 'third_place' | 'final'
export type Tab = 'schedule' | 'standings' | 'bracket' | 'players'

export interface Player {
  id: string
  name: string
  group: string
}

export interface Match {
  id: string
  day: Day
  group: Group
  player1Id: string
  player2Id: string
  stage: Stage
}

export interface GameScore {
  p1: number | null
  p2: number | null
}

export interface Result {
  game1: GameScore
  game2: GameScore
  game3: GameScore | null
  winnerId: string
  loserId: string
  pointsP1: number
  pointsP2: number
  wentToDecider: boolean
}

export interface StandingRow {
  playerId: string
  name: string
  played: number
  wins: number
  losses: number
  /** Tournament ranking points (match outcome) */
  points: number
  /** Sum of game points scored minus conceded across all group matches */
  pointDifference: number
}

export interface TournamentState {
  results: Record<string, Result>
  knockoutMatchIds: string[]
}
