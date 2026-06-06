import type { Day, Match, Player, Result } from '../types'
import type { CreateTournamentDraft, TournamentConfig } from '../types/tournament'
import { gamesToWinFromFormat } from './defaults'
import {
  buildDaysFromDateRange,
  distributeEvenlyAcrossDays,
  formatUsesKnockoutDay,
  planRoundsPerDay,
} from './scheduleDays'
import {
  datesChanged,
  matchesUseStaleDays,
  remapResultsToSchedule,
  scheduleNeedsRegeneration as needsRegeneration,
} from './scheduleUpdate'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function uniqueId(name: string): string {
  return `${slugify(name) || 'tournament'}-${Date.now().toString(36)}`
}

function playerIdFromName(name: string, index: number): string {
  const base = slugify(name) || `player-${index + 1}`
  return base
}

function ensureUniquePlayerIds(names: string[]): Player[] {
  const used = new Set<string>()
  return names.map((name, i) => {
    let id = playerIdFromName(name, i)
    let n = 2
    while (used.has(id)) {
      id = `${playerIdFromName(name, i)}-${n++}`
    }
    used.add(id)
    return { id, name: name.trim() || `Player ${i + 1}`, group: 'A' as const }
  })
}

function groupLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    String.fromCharCode(65 + i),
  ) as string[]
}

function distributePlayers(
  players: Player[],
  groupCount: number,
  autoBalance: boolean,
  manual: Record<string, string[]>,
): { groupIds: string[]; assignments: Record<string, string[]>; players: Player[] } {
  const groupIds = groupLabels(groupCount)
  const assignments: Record<string, string[]> = Object.fromEntries(
    groupIds.map((g) => [g, [] as string[]]),
  )

  if (!autoBalance && Object.keys(manual).length > 0) {
    const updated = players.map((p) => ({ ...p }))
    for (const [group, ids] of Object.entries(manual)) {
      if (assignments[group]) assignments[group] = [...ids]
      for (const id of ids) {
        const idx = updated.findIndex((p) => p.id === id)
        if (idx >= 0) updated[idx] = { ...updated[idx], group: group as 'A' | 'B' }
      }
    }
    return { groupIds, assignments, players: updated }
  }

  const updated = [...players]
  for (let i = 0; i < updated.length; i++) {
    const round = Math.floor(i / groupCount)
    const pos = i % groupCount
    const groupIndex = round % 2 === 0 ? pos : groupCount - 1 - pos
    const group = groupIds[groupIndex]
    updated[i] = { ...updated[i], group: group as 'A' | 'B' }
    assignments[group].push(updated[i].id)
  }

  return { groupIds, assignments, players: updated }
}

/** Classic circle-method rounds; each round every player plays at most once. */
function circleRoundRobinRounds(ids: readonly string[]): [string, string][][] {
  if (ids.length < 2) return []

  const players = [...ids]
  if (players.length % 2 === 1) players.push('__BYE__')

  const count = players.length
  const fixed = players[0]
  const rotating = players.slice(1)
  const rounds: [string, string][][] = []

  for (let round = 0; round < count - 1; round++) {
    const arranged = [fixed, ...rotating]
    const pairs: [string, string][] = []

    for (let i = 0; i < count / 2; i++) {
      const p1 = arranged[i]
      const p2 = arranged[count - 1 - i]
      if (p1 !== '__BYE__' && p2 !== '__BYE__') pairs.push([p1, p2])
    }

    rounds.push(pairs)
    rotating.unshift(rotating.pop()!)
  }

  return rounds
}

const MAX_MATCHES_PER_PLAYER_PER_DAY = 2

function nextPowerOfTwo(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

function matchId(day: Day, p1: string, p2: string): string {
  const sorted = [p1, p2].sort()
  return `${day}-${sorted[0]}-${sorted[1]}`
}

function buildSingleEliminationMatches(players: Player[], days: Day[]): Match[] {
  if (players.length < 2 || days.length === 0) return []

  const ids = players.map((p) => p.id)
  const bracketSize = nextPowerOfTwo(ids.length)
  const matches: Match[] = []

  const firstRoundPairs: [string, string][] = []
  let i = 0
  while (i < ids.length) {
    if (i + 1 < ids.length) {
      firstRoundPairs.push([ids[i], ids[i + 1]])
      i += 2
    } else {
      i += 1
    }
  }

  const buckets = distributeEvenlyAcrossDays(firstRoundPairs, days)
  for (const [day, pairs] of buckets) {
    for (const [p1, p2] of pairs) {
      matches.push({
        id: `ko-r1-${p1}-${p2}`,
        day,
        group: 'Knockout',
        player1Id: p1,
        player2Id: p2,
        stage: bracketSize > 4 ? 'group' : 'semifinal',
      })
    }
  }

  return matches
}

function buildGroupStageMatches(
  groupIds: string[],
  assignments: Record<string, string[]>,
  groupDays: Day[],
): { matches: Match[]; daysUsed: Day[] } {
  if (groupDays.length === 0) {
    return { matches: [], daysUsed: [] }
  }

  const roundsByGroup = groupIds.map((group) => ({
    group,
    rounds: circleRoundRobinRounds(assignments[group] ?? []),
  }))

  const maxRounds = Math.max(0, ...roundsByGroup.map(({ rounds }) => rounds.length))
  const roundsPerDay = planRoundsPerDay(maxRounds, groupDays.length)
  const matches: Match[] = []
  let roundIndex = 0

  for (let dayIndex = 0; dayIndex < groupDays.length; dayIndex++) {
    const roundsToday = roundsPerDay[dayIndex] ?? 0
    const day = groupDays[dayIndex]

    for (let slot = 0; slot < roundsToday; slot++) {
      const roundNumber = roundIndex++
      for (const { group, rounds } of roundsByGroup) {
        if (roundNumber >= rounds.length) continue
        for (const [p1, p2] of rounds[roundNumber]) {
          matches.push({
            id: matchId(day, p1, p2),
            day,
            group: group as Match['group'],
            player1Id: p1,
            player2Id: p2,
            stage: 'group',
          })
        }
      }
    }
  }

  return { matches, daysUsed: groupDays }
}

/** True if any player exceeds the daily match cap (used to repair old schedules). */
function preservePlayerIds(players: Player[], existing?: TournamentConfig): Player[] {
  if (!existing) return players

  const byName = new Map(
    existing.players.map((player) => [player.name.toLowerCase().trim(), player.id]),
  )

  return players.map((player) => {
    const previousId = byName.get(player.name.toLowerCase().trim())
    return previousId ? { ...player, id: previousId } : player
  })
}

export function scheduleExceedsDailyCap(
  matches: Match[],
  cap = MAX_MATCHES_PER_PLAYER_PER_DAY,
): boolean {
  const byDay = new Map<Day, Map<string, number>>()

  for (const match of matches) {
    if (match.group === 'Knockout') continue
    if (!byDay.has(match.day)) byDay.set(match.day, new Map())
    const counts = byDay.get(match.day)!
    for (const id of [match.player1Id, match.player2Id]) {
      const next = (counts.get(id) ?? 0) + 1
      if (next > cap) return true
      counts.set(id, next)
    }
  }

  return false
}

export function scheduleNeedsRegeneration(
  config: TournamentConfig,
  started = false,
): boolean {
  return needsRegeneration(config, (matches) => scheduleExceedsDailyCap(matches), started)
}

export { datesChanged, matchesUseStaleDays, remapResultsToSchedule }

export function buildTournamentFromDraft(
  draft: CreateTournamentDraft,
  existing?: TournamentConfig,
): TournamentConfig {
  const id = existing?.id ?? uniqueId(draft.name || 'tournament')
  const now = new Date().toISOString()
  const names =
    draft.playerNames.length >= draft.participantCount
      ? draft.playerNames.slice(0, draft.participantCount)
      : [
          ...draft.playerNames,
          ...Array.from(
            { length: draft.participantCount - draft.playerNames.length },
            (_, i) => `Player ${draft.playerNames.length + i + 1}`,
          ),
        ]

  let players = preservePlayerIds(ensureUniquePlayerIds(names), existing)
  let groupConfig: TournamentConfig['groupConfig']
  let groupMatches: Match[] = []

  const reserveKnockout = formatUsesKnockoutDay(draft.format)
  const { groupDays, allDays } = buildDaysFromDateRange(
    draft.startDate,
    draft.endDate,
    reserveKnockout,
  )

  switch (draft.format) {
    case 'round_robin': {
      const group = 'RR'
      players = players.map((p) => ({ ...p, group }))
      groupConfig = {
        groupIds: [group],
        assignments: { [group]: players.map((p) => p.id) },
        autoBalance: true,
      }
      groupMatches = buildGroupStageMatches([group], groupConfig.assignments, groupDays).matches
      break
    }
    case 'group_knockout':
    case 'swiss':
    case 'custom': {
      const { groupIds, assignments, players: seeded } = distributePlayers(
        players,
        draft.groupCount,
        draft.autoBalanceGroups,
        draft.groupAssignments,
      )
      players = seeded
      groupConfig = {
        groupIds,
        assignments,
        autoBalance: draft.autoBalanceGroups,
      }
      groupMatches = buildGroupStageMatches(groupIds, assignments, groupDays).matches
      break
    }
    case 'single_elimination':
    case 'double_elimination': {
      groupMatches = buildSingleEliminationMatches(players, allDays)
      groupConfig = undefined
      break
    }
  }

  const scheduleDays = allDays

  const scoringRules = {
    ...draft.scoringRules,
    gamesToWin: gamesToWinFromFormat(draft.matchFormat),
  }

  return {
    id,
    name: draft.name.trim() || 'Untitled Tournament',
    description: draft.description,
    imageUrl: draft.imageUrl,
    sportType: draft.sportType,
    startDate: draft.startDate,
    endDate: draft.endDate,
    format: draft.format,
    participantType: draft.participantType,
    seeding: draft.seeding,
    groupConfig,
    qualification:
      draft.format === 'group_knockout' || draft.format === 'custom'
        ? {
            rule: draft.qualificationRule,
            topNPerGroup: draft.topNPerGroup,
            knockoutPairing: 'cross',
          }
        : undefined,
    matchFormat: draft.matchFormat,
    scoringRules,
    tiebreakers: draft.tiebreakers,
    players,
    groupMatches,
    scheduleDays,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export function regenerateSchedule(config: TournamentConfig): TournamentConfig {
  return updateTournamentConfig(config, configToDraft(config))
}

export function updateTournamentConfig(
  existing: TournamentConfig,
  draft: CreateTournamentDraft,
): TournamentConfig {
  const built = buildTournamentFromDraft(draft, existing)
  return {
    ...built,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }
}

export function updateTournamentWithSchedule(
  existing: TournamentConfig,
  draft: CreateTournamentDraft,
  results: Record<string, Result>,
): { config: TournamentConfig; results: Record<string, Result> } {
  const config = updateTournamentConfig(existing, draft)
  const nextResults = remapResultsToSchedule(
    existing.groupMatches,
    config.groupMatches,
    results,
  )
  return { config, results: nextResults }
}

/** Build a wizard draft from a saved tournament (for editing). */
export function configToDraft(config: TournamentConfig): CreateTournamentDraft {
  const groupCount = config.groupConfig?.groupIds.length ?? 2

  return {
    name: config.name,
    description: config.description,
    imageUrl: config.imageUrl,
    sportType: config.sportType,
    startDate: config.startDate,
    endDate: config.endDate,
    participantType: config.participantType,
    participantCount: config.players.length,
    playerNames: config.players.map((p) => p.name),
    format: config.format,
    seeding: config.seeding,
    groupCount,
    playersPerGroup: Math.max(2, Math.ceil(config.players.length / groupCount)),
    autoBalanceGroups: config.groupConfig?.autoBalance ?? true,
    groupAssignments: config.groupConfig?.assignments ?? {},
    qualificationRule: config.qualification?.rule ?? 'top_2',
    topNPerGroup: config.qualification?.topNPerGroup ?? 2,
    matchFormat: config.matchFormat,
    scoringRules: config.scoringRules,
    tiebreakers: [...config.tiebreakers],
  }
}

/** Ensure playerNames length matches participantCount with sensible defaults. */
export function syncPlayerRoster(count: number, names: string[]): string[] {
  const next = [...names]
  while (next.length < count) {
    next.push(`Player ${next.length + 1}`)
  }
  return next.slice(0, count)
}
