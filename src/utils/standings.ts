import { GROUP_PLAYER_ORDER, playerMap } from '../data/players'
import { GROUP_MATCHES } from '../data/schedule'
import type { GameScore, Match, Result, StandingRow } from '../types'

function groupMatches(group: 'A' | 'B'): Match[] {
  return GROUP_MATCHES.filter((m) => m.group === group)
}

function playerGamePoints(
  playerId: string,
  match: Match,
  result: Result,
): { scored: number; conceded: number } {
  const games = [result.game1, result.game2, result.game3].filter(
    (g): g is GameScore => g !== null && g.p1 !== null && g.p2 !== null,
  )

  let scored = 0
  let conceded = 0

  for (const g of games) {
    const mine = match.player1Id === playerId ? g.p1! : g.p2!
    const theirs = match.player1Id === playerId ? g.p2! : g.p1!
    scored += mine
    conceded += theirs
  }

  return { scored, conceded }
}

function buildStandingRows(
  group: 'A' | 'B',
  results: Record<string, Result>,
): StandingRow[] {
  const order = GROUP_PLAYER_ORDER[group]
  const rows: StandingRow[] = order.map((id) => ({
    playerId: id,
    name: playerMap[id]?.name ?? id,
    played: 0,
    wins: 0,
    losses: 0,
    points: 0,
    pointDifference: 0,
  }))

  const rowMap = Object.fromEntries(rows.map((r) => [r.playerId, r]))

  for (const match of groupMatches(group)) {
    const result = results[match.id]
    if (!result) continue

    const p1 = rowMap[match.player1Id]
    const p2 = rowMap[match.player2Id]
    if (!p1 || !p2) continue

    const p1Games = playerGamePoints(match.player1Id, match, result)
    const p2Games = playerGamePoints(match.player2Id, match, result)

    p1.pointDifference += p1Games.scored - p1Games.conceded
    p2.pointDifference += p2Games.scored - p2Games.conceded

    p1.played++
    p2.played++

    if (result.winnerId === match.player1Id) {
      p1.wins++
      p2.losses++
      p1.points += result.pointsP1
      p2.points += result.pointsP2
    } else {
      p2.wins++
      p1.losses++
      p2.points += result.pointsP2
      p1.points += result.pointsP1
    }
  }

  return rows
}

function findGroupMatch(
  group: 'A' | 'B',
  playerA: string,
  playerB: string,
): Match | undefined {
  return groupMatches(group).find(
    (m) =>
      (m.player1Id === playerA && m.player2Id === playerB) ||
      (m.player1Id === playerB && m.player2Id === playerA),
  )
}

/** Negative → `a` ranks above `b`; positive → `b` above `a`; 0 → still tied. */
function headToHeadCompare(
  playerA: string,
  playerB: string,
  group: 'A' | 'B',
  results: Record<string, Result>,
): number {
  const match = findGroupMatch(group, playerA, playerB)
  if (!match) return 0

  const result = results[match.id]
  if (!result) return 0

  if (result.winnerId === playerA) return -1
  if (result.winnerId === playerB) return 1
  return 0
}

export function compareStandingRows(
  a: StandingRow,
  b: StandingRow,
  group: 'A' | 'B',
  results: Record<string, Result>,
): number {
  if (b.points !== a.points) return b.points - a.points
  if (b.pointDifference !== a.pointDifference) {
    return b.pointDifference - a.pointDifference
  }

  const h2h = headToHeadCompare(a.playerId, b.playerId, group, results)
  if (h2h !== 0) return h2h

  if (b.wins !== a.wins) return b.wins - a.wins
  return a.name.localeCompare(b.name)
}

function sortStandingRows(
  rows: StandingRow[],
  group: 'A' | 'B',
  results: Record<string, Result>,
): StandingRow[] {
  return [...rows].sort((a, b) => compareStandingRows(a, b, group, results))
}

/** Group standings for the UI — ranked by points, then tie-breakers. */
export function computeGroupStandings(
  group: 'A' | 'B',
  results: Record<string, Result>,
): StandingRow[] {
  const rows = buildStandingRows(group, results)
  return sortStandingRows(rows, group, results)
}

/** Same ranking order as the standings table (knockout seeding). */
export function computeRankedStandings(
  group: 'A' | 'B',
  results: Record<string, Result>,
): StandingRow[] {
  return computeGroupStandings(group, results)
}

export function isGroupStageComplete(results: Record<string, Result>): boolean {
  return GROUP_MATCHES.every((m) => results[m.id] !== undefined)
}

export function getQualifiedPlayers(
  results: Record<string, Result>,
): { a1: string; a2: string; b1: string; b2: string } | null {
  if (!isGroupStageComplete(results)) return null

  const groupA = computeRankedStandings('A', results)
  const groupB = computeRankedStandings('B', results)

  return {
    a1: groupA[0].playerId,
    a2: groupA[1].playerId,
    b1: groupB[0].playerId,
    b2: groupB[1].playerId,
  }
}

export function buildKnockoutMatches(qualified: {
  a1: string
  a2: string
  b1: string
  b2: string
}): Match[] {
  return [
    {
      id: 'sun-semi-a1-b2',
      day: 'Sun',
      group: 'Knockout',
      player1Id: qualified.a1,
      player2Id: qualified.b2,
      stage: 'semifinal',
    },
    {
      id: 'sun-semi-b1-a2',
      day: 'Sun',
      group: 'Knockout',
      player1Id: qualified.b1,
      player2Id: qualified.a2,
      stage: 'semifinal',
    },
  ]
}

export function buildPlacementMatches(
  semis: Match[],
  results: Record<string, Result>,
): Match[] {
  const semi1 = results[semis[0].id]
  const semi2 = results[semis[1].id]
  if (!semi1 || !semi2) return []

  return [
    {
      id: 'sun-third',
      day: 'Sun',
      group: 'Knockout',
      player1Id: semi1.loserId,
      player2Id: semi2.loserId,
      stage: 'third_place',
    },
    {
      id: 'sun-final',
      day: 'Sun',
      group: 'Knockout',
      player1Id: semi1.winnerId,
      player2Id: semi2.winnerId,
      stage: 'final',
    },
  ]
}

export function getAllMatches(
  results: Record<string, Result>,
): Match[] {
  const qualified = getQualifiedPlayers(results)
  if (!qualified) return [...GROUP_MATCHES]

  const semis = buildKnockoutMatches(qualified)
  const placement = buildPlacementMatches(semis, results)

  return [...GROUP_MATCHES, ...semis, ...placement]
}

export function isTournamentComplete(
  matches: Match[],
  results: Record<string, Result>,
): boolean {
  const knockout = matches.filter((m) => m.group === 'Knockout')
  return knockout.length === 4 && knockout.every((m) => results[m.id] !== undefined)
}

export function getPodium(results: Record<string, Result>, matches: Match[]) {
  const final = matches.find((m) => m.stage === 'final')
  const third = matches.find((m) => m.stage === 'third_place')
  if (!final || !third) return null

  const finalResult = results[final.id]
  const thirdResult = results[third.id]
  if (!finalResult || !thirdResult) return null

  return {
    first: finalResult.winnerId,
    second: finalResult.loserId,
    third: thirdResult.winnerId,
  }
}
