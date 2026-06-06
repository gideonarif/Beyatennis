import type { GameScore, Match, Result } from '../types'
import type { ScoringRulesConfig } from '../types/tournament'
import { getRankingPoints } from '../tournament/defaults'
import type { TournamentRuntime } from '../tournament/runtime'
import { getAllMatches } from './standings'

/** First to 21 wins before deuce; from 20–20, need a 2-point lead. */
export function getGameWinner(score: GameScore): 'p1' | 'p2' | null {
  const { p1, p2 } = score
  if (p1 === null || p2 === null) return null
  if (p1 === p2) return null

  const high = Math.max(p1, p2)
  const low = Math.min(p1, p2)
  const diff = high - low

  // Won before deuce zone (e.g. 21–19, 21–18)
  if (low <= 19 && high >= 21) {
    return p1 > p2 ? 'p1' : 'p2'
  }

  // Deuce / extended play (both at 20+): 2-point clearance
  if (low >= 20 && diff >= 2) {
    return p1 > p2 ? 'p1' : 'p2'
  }

  return null
}

function gameWinner(score: GameScore): 'p1' | 'p2' | null {
  return getGameWinner(score)
}

function gameWins(
  g1: GameScore,
  g2: GameScore,
  g3: GameScore | null,
): { p1Wins: number; p2Wins: number } {
  let p1Wins = 0
  let p2Wins = 0
  for (const g of [g1, g2, g3]) {
    if (!g) continue
    const w = gameWinner(g)
    if (w === 'p1') p1Wins++
    else if (w === 'p2') p2Wins++
  }
  return { p1Wins, p2Wins }
}

export function isGameComplete(score: GameScore): boolean {
  return getGameWinner(score) !== null
}

export function isGame3Unlocked(g1: GameScore, g2: GameScore): boolean {
  if (!isGameComplete(g1) || !isGameComplete(g2)) return false
  const { p1Wins, p2Wins } = gameWins(g1, g2, null)
  return p1Wins === 1 && p2Wins === 1
}

export function canSubmitMatch(
  g1: GameScore,
  g2: GameScore,
  g3: GameScore | null,
): boolean {
  if (!isGameComplete(g1) || !isGameComplete(g2)) return false
  const { p1Wins, p2Wins } = gameWins(g1, g2, null)

  if (p1Wins === 2 || p2Wins === 2) return true

  if (p1Wins === 1 && p2Wins === 1) {
    return g3 !== null && isGameComplete(g3)
  }

  return false
}

export function computeResult(
  player1Id: string,
  player2Id: string,
  g1: GameScore,
  g2: GameScore,
  g3: GameScore | null,
  _isKnockout = false,
  rules?: ScoringRulesConfig,
): Result | null {
  if (!canSubmitMatch(g1, g2, g3)) return null

  const { p1Wins, p2Wins } = gameWins(g1, g2, g3)
  const p1WonMatch = p1Wins > p2Wins
  const wentToDecider =
    isGame3Unlocked(g1, g2) && g3 !== null && isGameComplete(g3)

  const scoring = rules ?? {
    pointsPerGame: 21,
    deuceAt: 20,
    winBy: 2,
    gamesToWin: 2,
    pointsRules: [],
  }

  const pointsP1 = getRankingPoints(scoring, wentToDecider, p1WonMatch)
  const pointsP2 = getRankingPoints(scoring, wentToDecider, !p1WonMatch)

  return {
    game1: g1,
    game2: g2,
    game3: wentToDecider ? g3 : null,
    winnerId: p1WonMatch ? player1Id : player2Id,
    loserId: p1WonMatch ? player2Id : player1Id,
    pointsP1,
    pointsP2,
    wentToDecider,
  }
}

export function emptyGame(): GameScore {
  return { p1: null, p2: null }
}

/** Re-apply current ranking rules to a saved result (fixes stale points in storage). */
export function normalizeResult(
  match: Pick<Match, 'player1Id' | 'player2Id' | 'group'>,
  stored: Result,
  rules?: ScoringRulesConfig,
): Result {
  const fresh = computeResult(
    match.player1Id,
    match.player2Id,
    stored.game1,
    stored.game2,
    stored.game3,
    match.group === 'Knockout',
    rules,
  )
  return fresh ?? stored
}

/** Repair all stored results so standings and profiles use current point rules. */
export function repairStoredResults(
  runtime: TournamentRuntime,
  results: Record<string, Result>,
): {
  results: Record<string, Result>
  changed: boolean
} {
  const matches = getAllMatches(runtime, results)
  const next = { ...results }
  let changed = false
  const rules = runtime.config.scoringRules

  for (const match of matches) {
    const stored = next[match.id]
    if (!stored) continue

    const fresh = computeResult(
      match.player1Id,
      match.player2Id,
      stored.game1,
      stored.game2,
      stored.game3,
      match.group === 'Knockout',
      rules,
    )
    const fixed = fresh ?? stored

    if (
      stored.pointsP1 !== fixed.pointsP1 ||
      stored.pointsP2 !== fixed.pointsP2 ||
      stored.winnerId !== fixed.winnerId ||
      stored.loserId !== fixed.loserId ||
      stored.wentToDecider !== fixed.wentToDecider
    ) {
      next[match.id] = fixed
      changed = true
    }
  }

  return { results: next, changed }
}
