import { DAY_LABELS, DAYS } from '../data/schedule'
import { playerName } from '../data/players'
import type { Day, Match, Result } from '../types'

export interface PlayerMatchRow {
  match: Match
  opponentId: string
  opponentName: string
  day: Day
  dayLabel: string
  result?: Result
  isUpcoming: boolean
  scoreSummary: string
  won: boolean | null
  matchPoints: number | null
}

function formatGameScore(
  playerId: string,
  match: Match,
  result: Result,
): string {
  const games = [result.game1, result.game2, result.game3].filter(Boolean) as {
    p1: number | null
    p2: number | null
  }[]

  const parts = games.map((g) => {
    const mine =
      match.player1Id === playerId ? g.p1 : g.p2
    const theirs =
      match.player1Id === playerId ? g.p2 : g.p1
    return `${mine ?? '–'}–${theirs ?? '–'}`
  })

  return parts.join(', ')
}

export function getPlayerMatches(
  playerId: string,
  matches: Match[],
  results: Record<string, Result>,
): PlayerMatchRow[] {
  const playerMatches = matches.filter(
    (m) => m.player1Id === playerId || m.player2Id === playerId,
  )

  const dayIndex = (d: Day) => DAYS.indexOf(d)

  return playerMatches
    .map((match) => {
      const opponentId =
        match.player1Id === playerId ? match.player2Id : match.player1Id
      const result = results[match.id]
      const isUpcoming = !result

      let won: boolean | null = null
      let matchPoints: number | null = null

      if (result) {
        won = result.winnerId === playerId
        matchPoints =
          match.player1Id === playerId ? result.pointsP1 : result.pointsP2
      }

      return {
        match,
        opponentId,
        opponentName: playerName(opponentId),
        day: match.day,
        dayLabel: DAY_LABELS[match.day],
        result,
        isUpcoming,
        scoreSummary: result ? formatGameScore(playerId, match, result) : '—',
        won,
        matchPoints,
      }
    })
    .sort((a, b) => dayIndex(a.day) - dayIndex(b.day))
}
