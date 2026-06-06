import type { GameScore, Match, Result, StandingRow } from '../types'
import type { TiebreakerCriterion } from '../types/tournament'
import type { TournamentRuntime } from '../tournament/runtime'
import { getKnockoutDay } from '../tournament/scheduleDays'

function groupMatches(ctx: TournamentRuntime, group: string): Match[] {
  return ctx.groupMatches.filter((m) => m.group === group)
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
  ctx: TournamentRuntime,
  group: string,
  results: Record<string, Result>,
): StandingRow[] {
  const order = ctx.groupPlayerOrder[group] ?? []
  const rows: StandingRow[] = order.map((id) => ({
    playerId: id,
    name: ctx.getPlayerName(id),
    played: 0,
    wins: 0,
    losses: 0,
    points: 0,
    pointDifference: 0,
  }))

  const rowMap = Object.fromEntries(rows.map((r) => [r.playerId, r]))

  for (const match of groupMatches(ctx, group)) {
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
  ctx: TournamentRuntime,
  group: string,
  playerA: string,
  playerB: string,
): Match | undefined {
  return groupMatches(ctx, group).find(
    (m) =>
      (m.player1Id === playerA && m.player2Id === playerB) ||
      (m.player1Id === playerB && m.player2Id === playerA),
  )
}

function headToHeadCompare(
  ctx: TournamentRuntime,
  playerA: string,
  playerB: string,
  group: string,
  results: Record<string, Result>,
): number {
  const match = findGroupMatch(ctx, group, playerA, playerB)
  if (!match) return 0

  const result = results[match.id]
  if (!result) return 0

  if (result.winnerId === playerA) return -1
  if (result.winnerId === playerB) return 1
  return 0
}

function tiebreakerCompare(
  ctx: TournamentRuntime,
  criterion: TiebreakerCriterion,
  a: StandingRow,
  b: StandingRow,
  group: string,
  results: Record<string, Result>,
): number {
  switch (criterion) {
    case 'total_points':
      return b.points - a.points
    case 'score_difference':
      return b.pointDifference - a.pointDifference
    case 'head_to_head':
      return headToHeadCompare(ctx, a.playerId, b.playerId, group, results)
    case 'match_difference':
      return b.wins - b.losses - (a.wins - a.losses)
    case 'game_difference':
      return b.pointDifference - a.pointDifference
    case 'total_wins':
      return b.wins - a.wins
    case 'seed_ranking': {
      const order = ctx.groupPlayerOrder[group] ?? []
      return order.indexOf(a.playerId) - order.indexOf(b.playerId)
    }
    default:
      return 0
  }
}

export function compareStandingRows(
  ctx: TournamentRuntime,
  a: StandingRow,
  b: StandingRow,
  group: string,
  results: Record<string, Result>,
): number {
  const tiebreakers = ctx.config.tiebreakers.length
    ? ctx.config.tiebreakers
    : (['total_points', 'score_difference', 'head_to_head', 'total_wins'] as TiebreakerCriterion[])

  for (const criterion of tiebreakers) {
    const cmp = tiebreakerCompare(ctx, criterion, a, b, group, results)
    if (cmp !== 0) return cmp
  }

  return a.name.localeCompare(b.name)
}

function sortStandingRows(
  ctx: TournamentRuntime,
  rows: StandingRow[],
  group: string,
  results: Record<string, Result>,
): StandingRow[] {
  return [...rows].sort((a, b) => compareStandingRows(ctx, a, b, group, results))
}

export function computeGroupStandings(
  ctx: TournamentRuntime,
  group: string,
  results: Record<string, Result>,
): StandingRow[] {
  const rows = buildStandingRows(ctx, group, results)
  return sortStandingRows(ctx, rows, group, results)
}

export function computeRankedStandings(
  ctx: TournamentRuntime,
  group: string,
  results: Record<string, Result>,
): StandingRow[] {
  return computeGroupStandings(ctx, group, results)
}

export function getProvisionalQualifiedPlayers(
  ctx: TournamentRuntime,
  results: Record<string, Result>,
): Record<string, string> {
  const topN = ctx.config.qualification?.topNPerGroup ?? 2
  const groupIds = ctx.getGroupIds()
  const qualified: Record<string, string> = {}

  for (const group of groupIds) {
    const ranked = computeRankedStandings(ctx, group, results)
    for (let i = 0; i < topN && i < ranked.length; i++) {
      qualified[`${group}${i + 1}`] = ranked[i].playerId
    }
  }

  return qualified
}

export function isGroupStageComplete(
  ctx: TournamentRuntime,
  results: Record<string, Result>,
): boolean {
  return ctx.groupMatches.every((m) => results[m.id] !== undefined)
}

export function getQualifiedPlayers(
  ctx: TournamentRuntime,
  results: Record<string, Result>,
): Record<string, string> | null {
  if (!isGroupStageComplete(ctx, results)) return null
  return getProvisionalQualifiedPlayers(ctx, results)
}

/** Legacy shape for 2-group cross knockout (A/B). */
export function qualifiedToLegacyPairing(qualified: Record<string, string>): {
  a1: string
  a2: string
  b1: string
  b2: string
} | null {
  if (!qualified.A1 || !qualified.A2 || !qualified.B1 || !qualified.B2) return null
  return {
    a1: qualified.A1,
    a2: qualified.A2,
    b1: qualified.B1,
    b2: qualified.B2,
  }
}

export function buildKnockoutMatches(
  ctx: TournamentRuntime,
  qualified: Record<string, string>,
): Match[] {
  const pairing = ctx.config.qualification?.knockoutPairing ?? 'cross'
  const legacy = qualifiedToLegacyPairing(qualified)
  const knockoutDay = getKnockoutDay(ctx.config)

  if (legacy && pairing === 'cross') {
    return [
      {
        id: 'sun-semi-a1-b2',
        day: knockoutDay,
        group: 'Knockout',
        player1Id: legacy.a1,
        player2Id: legacy.b2,
        stage: 'semifinal',
      },
      {
        id: 'sun-semi-b1-a2',
        day: knockoutDay,
        group: 'Knockout',
        player1Id: legacy.b1,
        player2Id: legacy.a2,
        stage: 'semifinal',
      },
    ]
  }

  const slots = Object.entries(qualified)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, id]) => id)

  const semis: Match[] = []
  for (let i = 0; i + 1 < slots.length; i += 2) {
    semis.push({
      id: `knockout-semi-${i / 2 + 1}`,
      day: knockoutDay,
      group: 'Knockout',
      player1Id: slots[i],
      player2Id: slots[i + 1],
      stage: 'semifinal',
    })
  }
  return semis
}

export function buildPlacementMatches(
  ctx: TournamentRuntime,
  semis: Match[],
  results: Record<string, Result>,
): Match[] {
  if (semis.length < 2) return []

  const semi1 = results[semis[0].id]
  const semi2 = results[semis[1].id]
  if (!semi1 || !semi2) return []

  const knockoutDay = getKnockoutDay(ctx.config)

  return [
    {
      id: 'sun-third',
      day: knockoutDay,
      group: 'Knockout',
      player1Id: semi1.loserId,
      player2Id: semi2.loserId,
      stage: 'third_place',
    },
    {
      id: 'sun-final',
      day: knockoutDay,
      group: 'Knockout',
      player1Id: semi1.winnerId,
      player2Id: semi2.winnerId,
      stage: 'final',
    },
  ]
}

export function getAllMatches(
  ctx: TournamentRuntime,
  results: Record<string, Result>,
): Match[] {
  if (ctx.config.format === 'single_elimination' || ctx.config.format === 'double_elimination') {
    return ctx.groupMatches
  }

  if (ctx.config.format === 'round_robin' || ctx.config.format === 'swiss') {
    return [...ctx.groupMatches]
  }

  const qualified = getProvisionalQualifiedPlayers(ctx, results)
  const semis = buildKnockoutMatches(ctx, qualified)
  const placement = buildPlacementMatches(ctx, semis, results)

  return [...ctx.groupMatches, ...semis, ...placement]
}

export function isTournamentComplete(
  ctx: TournamentRuntime,
  matches: Match[],
  results: Record<string, Result>,
): boolean {
  if (ctx.config.format === 'round_robin') {
    return isGroupStageComplete(ctx, results)
  }

  const knockout = matches.filter((m) => m.group === 'Knockout')
  if (knockout.length === 0) return isGroupStageComplete(ctx, results)
  return knockout.every((m) => results[m.id] !== undefined)
}

export function getPodium(
  results: Record<string, Result>,
  matches: Match[],
) {
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

/** Round-robin / single-group standings for formats without per-group tables. */
export function computeAllStandings(
  ctx: TournamentRuntime,
  results: Record<string, Result>,
): StandingRow[] {
  const groupIds = ctx.getGroupIds()
  if (groupIds.length === 1) {
    return computeGroupStandings(ctx, groupIds[0], results)
  }
  return groupIds.flatMap((g) => computeGroupStandings(ctx, g, results))
}
