import type { Day, Match, Result } from '../types'
import { formatDayLabel } from '../tournament/scheduleDays'

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
    const mine = match.player1Id === playerId ? g.p1 : g.p2
    const theirs = match.player1Id === playerId ? g.p2 : g.p1
    return `${mine ?? '–'}–${theirs ?? '–'}`
  })

  return parts.join(', ')
}

function dayLabel(day: Day): string {
  return formatDayLabel(day)
}

function dayOrder(day: Day, allDays: Day[]): number {
  const idx = allDays.indexOf(day)
  if (idx >= 0) return idx
  return day.charCodeAt(0)
}

export function getPlayerMatches(
  playerId: string,
  matches: Match[],
  results: Record<string, Result>,
  getPlayerName: (id: string) => string = (id) => id,
): PlayerMatchRow[] {
  const playerMatches = matches.filter(
    (m) => m.player1Id === playerId || m.player2Id === playerId,
  )

  const allDays = [...new Set(playerMatches.map((m) => m.day))]

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
        opponentName: getPlayerName(opponentId),
        day: match.day,
        dayLabel: dayLabel(match.day),
        result,
        isUpcoming,
        scoreSummary: result ? formatGameScore(playerId, match, result) : '—',
        won,
        matchPoints,
      }
    })
    .sort((a, b) => dayOrder(a.day, allDays) - dayOrder(b.day, allDays))
}

export function getPlayerStats(matches: PlayerMatchRow[]) {
  const completed = matches.filter((m) => !m.isUpcoming)
  const wins = completed.filter((m) => m.won).length
  const losses = completed.filter((m) => m.won === false).length
  const points = completed.reduce((sum, m) => sum + (m.matchPoints ?? 0), 0)
  return { played: completed.length, wins, losses, points }
}
