import type { Match, Result } from '../types'
import type { TournamentRuntime } from '../tournament/runtime'
import { computeGroupStandings } from './standings'

const OUTCOME_SPECS = [
  { p1Win: true, decider: false },
  { p1Win: true, decider: true },
  { p1Win: false, decider: false },
  { p1Win: false, decider: true },
] as const

const FULL_SIM_MAX_UNPLAYED = 7

export type QualificationStatus =
  | 'clinched'
  | 'contending'
  | 'eliminated'
  | 'waiting'

export interface PlayerQualification {
  playerId: string
  status: QualificationStatus
  topTwoScenarios: number
  totalScenarios: number
}

let qualificationCacheKey = ''
let qualificationCache = new Set<string>()

function topN(ctx: TournamentRuntime): number {
  return ctx.config.qualification?.topNPerGroup ?? 2
}

function unplayedGroupMatches(
  ctx: TournamentRuntime,
  group: string,
  results: Record<string, Result>,
): Match[] {
  return ctx.groupMatches.filter((m) => m.group === group && !results[m.id])
}

function remainingMatchCount(
  ctx: TournamentRuntime,
  group: string,
  playerId: string,
  results: Record<string, Result>,
): number {
  return unplayedGroupMatches(ctx, group, results).filter(
    (m) => m.player1Id === playerId || m.player2Id === playerId,
  ).length
}

function buildSimulatedResult(
  match: Match,
  spec: (typeof OUTCOME_SPECS)[number],
): Result {
  const p1Won = spec.p1Win
  const wentToDecider = spec.decider

  const g1 = { p1: p1Won ? 21 : 15, p2: p1Won ? 15 : 21 }
  const g2 = { p1: p1Won ? 21 : 15, p2: p1Won ? 15 : 21 }
  const g3 = wentToDecider ? { p1: p1Won ? 21 : 19, p2: p1Won ? 19 : 21 } : null

  const pointsP1 = p1Won ? (wentToDecider ? 2 : 3) : wentToDecider ? 1 : 0
  const pointsP2 = !p1Won ? (wentToDecider ? 2 : 3) : wentToDecider ? 1 : 0

  return {
    game1: g1,
    game2: g2,
    game3: g3,
    winnerId: p1Won ? match.player1Id : match.player2Id,
    loserId: p1Won ? match.player2Id : match.player1Id,
    pointsP1,
    pointsP2,
    wentToDecider,
  }
}

function deriveStatus(qualified: number, total: number): QualificationStatus {
  if (qualified === total) return 'clinched'
  if (qualified === 0) return 'eliminated'
  return 'contending'
}

function isStrictlyClinchedOnPoints(
  ctx: TournamentRuntime,
  group: string,
  playerId: string,
  results: Record<string, Result>,
): boolean {
  const rows = computeGroupStandings(ctx, group, results)
  const player = rows.find((r) => r.playerId === playerId)
  if (!player) return false

  for (const row of rows) {
    if (row.playerId === playerId) continue
    const maxPoints = row.points + remainingMatchCount(ctx, group, row.playerId, results) * 3
    if (maxPoints >= player.points) return false
  }

  return true
}

function simulateGroupTopNCounts(
  ctx: TournamentRuntime,
  group: string,
  results: Record<string, Result>,
): { counts: Map<string, number>; total: number } {
  const n = topN(ctx)
  const playerIds = [...(ctx.groupPlayerOrder[group] ?? [])]
  const counts = new Map(playerIds.map((id) => [id, 0]))
  const unplayed = unplayedGroupMatches(ctx, group, results)
  const total = 4 ** unplayed.length

  if (total === 1) {
    const ranked = computeGroupStandings(ctx, group, results)
    for (let i = 0; i < n && i < ranked.length; i++) {
      counts.set(ranked[i].playerId, 1)
    }
    return { counts, total: 1 }
  }

  const simResults = { ...results }

  function walk(matchIndex: number) {
    if (matchIndex === unplayed.length) {
      const ranked = computeGroupStandings(ctx, group, simResults)
      for (let i = 0; i < n && i < ranked.length; i++) {
        const id = ranked[i].playerId
        counts.set(id, (counts.get(id) ?? 0) + 1)
      }
      return
    }

    const match = unplayed[matchIndex]
    for (const spec of OUTCOME_SPECS) {
      simResults[match.id] = buildSimulatedResult(match, spec)
      walk(matchIndex + 1)
    }
    delete simResults[match.id]
  }

  walk(0)
  return { counts, total }
}

export function getGroupQualification(
  ctx: TournamentRuntime,
  group: string,
  results: Record<string, Result>,
): PlayerQualification[] {
  const n = topN(ctx)
  const playerIds = [...(ctx.groupPlayerOrder[group] ?? [])]
  const unplayed = unplayedGroupMatches(ctx, group, results)

  if (unplayed.length === 0) {
    const ranked = computeGroupStandings(ctx, group, results)
    const qualified = new Set(ranked.slice(0, n).map((r) => r.playerId))
    return playerIds.map((playerId) => ({
      playerId,
      status: qualified.has(playerId) ? 'clinched' : 'eliminated',
      topTwoScenarios: qualified.has(playerId) ? 1 : 0,
      totalScenarios: 1,
    }))
  }

  if (unplayed.length > FULL_SIM_MAX_UNPLAYED) {
    return playerIds.map((playerId) => {
      const clinched = isStrictlyClinchedOnPoints(ctx, group, playerId, results)
      return {
        playerId,
        status: clinched ? 'clinched' : 'contending',
        topTwoScenarios: clinched ? 1 : 0,
        totalScenarios: 1,
      }
    })
  }

  const { counts, total } = simulateGroupTopNCounts(ctx, group, results)

  return playerIds.map((playerId) => {
    const qualified = counts.get(playerId) ?? 0
    return {
      playerId,
      status: deriveStatus(qualified, total),
      topTwoScenarios: qualified,
      totalScenarios: total,
    }
  })
}

function resultsCacheKey(ctx: TournamentRuntime, results: Record<string, Result>): string {
  const keys = Object.keys(results).sort()
  if (keys.length === 0) return ctx.config.id
  return `${ctx.config.id}|${keys.map((k) => `${k}:${results[k].pointsP1}-${results[k].pointsP2}`).join('|')}`
}

export function getGuaranteedQualifiedPlayerIds(
  ctx: TournamentRuntime,
  results: Record<string, Result>,
): Set<string> {
  const key = resultsCacheKey(ctx, results)
  if (key === qualificationCacheKey) return qualificationCache

  const ids = new Set<string>()

  for (const group of ctx.getGroupIds()) {
    for (const entry of getGroupQualification(ctx, group, results)) {
      if (entry.status === 'clinched') ids.add(entry.playerId)
    }
  }

  qualificationCacheKey = key
  qualificationCache = ids
  return ids
}

export function getQualificationByPlayerId(
  ctx: TournamentRuntime,
  results: Record<string, Result>,
): Map<string, PlayerQualification> {
  const map = new Map<string, PlayerQualification>()

  for (const group of ctx.getGroupIds()) {
    for (const entry of getGroupQualification(ctx, group, results)) {
      map.set(entry.playerId, entry)
    }
  }

  return map
}
