import type { GameScore, Result } from '../types'

function gameWinner(score: GameScore): 'p1' | 'p2' | null {
  if (score.p1 === null || score.p2 === null) return null
  if (score.p1 === score.p2) return null
  return score.p1 > score.p2 ? 'p1' : 'p2'
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
  return score.p1 !== null && score.p2 !== null && score.p1 !== score.p2
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
): Result | null {
  if (!canSubmitMatch(g1, g2, g3)) return null

  const { p1Wins, p2Wins } = gameWins(g1, g2, g3)
  const p1WonMatch = p1Wins > p2Wins
  const wentToDecider = p1Wins === 1 && p2Wins === 1 && g3 !== null && isGameComplete(g3)

  let pointsP1: number
  let pointsP2: number

  if (wentToDecider) {
    pointsP1 = p1WonMatch ? 2 : 1
    pointsP2 = p1WonMatch ? 1 : 2
  } else {
    pointsP1 = p1WonMatch ? 3 : 0
    pointsP2 = p1WonMatch ? 0 : 3
  }

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
