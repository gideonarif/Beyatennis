import { formatDayLabel } from '../tournament/scheduleDays'
import { playerName } from '../data/players'
import { getGameWinner } from './scoring'
import type { GameScore, Match, Result } from '../types'

export interface PlayerResultLine {
  playerId: string
  name: string
  gamesWon: number
  gameScores: number[]
  isWinner: boolean
}

export interface MatchResultDisplay {
  title: string
  subtitle: string
  player1: PlayerResultLine
  player2: PlayerResultLine
}

function playedGames(result: Result): GameScore[] {
  return [result.game1, result.game2, result.game3].filter(
    (g): g is GameScore =>
      g !== null && g.p1 !== null && g.p2 !== null,
  )
}

function matchTitle(match: Match): string {
  if (match.group === 'Knockout') {
    const stage =
      match.stage === 'semifinal'
        ? 'Semi Final'
        : match.stage === 'third_place'
          ? '3rd Place'
          : match.stage === 'final'
            ? 'Final'
            : 'Knockout'
    return `Knockout — ${stage}`
  }
  return `Group ${match.group}`
}

export function getMatchResultDisplay(
  match: Match,
  result: Result,
): MatchResultDisplay {
  const games = playedGames(result)
  let p1Wins = 0
  let p2Wins = 0
  const p1Scores: number[] = []
  const p2Scores: number[] = []

  for (const g of games) {
    p1Scores.push(g.p1!)
    p2Scores.push(g.p2!)
    const w = getGameWinner(g)
    if (w === 'p1') p1Wins++
    else if (w === 'p2') p2Wins++
  }

  const p1Won = result.winnerId === match.player1Id

  return {
    title: matchTitle(match),
    subtitle: formatDayLabel(match.day),
    player1: {
      playerId: match.player1Id,
      name: playerName(match.player1Id),
      gamesWon: p1Wins,
      gameScores: p1Scores,
      isWinner: p1Won,
    },
    player2: {
      playerId: match.player2Id,
      name: playerName(match.player2Id),
      gamesWon: p2Wins,
      gameScores: p2Scores,
      isWinner: !p1Won,
    },
  }
}
