import type { Day, Match } from '../types'

type ScheduledPair = [string, string]

const groupSchedule: Record<Exclude<Day, 'Sun'>, { A: ScheduledPair[]; B: ScheduledPair[] }> = {
  Tue: {
    A: [
      ['bereket', 'dere'],
      ['naty', 'bereket'],
    ],
    B: [
      ['gedion', 'yetagesu'],
      ['yetagesu', 'nafkot'],
    ],
  },
  Wed: {
    A: [
      ['bereket', 'tade'],
      ['naty', 'wogderes'],
    ],
    B: [
      ['gedion', 'melaku'],
      ['yetagesu', 'beya'],
    ],
  },
  Thu: {
    A: [
      ['wogderes', 'dere'],
      ['naty', 'dere'],
    ],
    B: [
      ['gedion', 'nafkot'],
      ['melaku', 'nafkot'],
    ],
  },
  Fri: {
    A: [
      ['wogderes', 'tade'],
      ['naty', 'tade'],
    ],
    B: [
      ['gedion', 'beya'],
      ['melaku', 'beya'],
    ],
  },
  Sat: {
    A: [
      ['dere', 'tade'],
      ['bereket', 'wogderes'],
    ],
    B: [
      ['yetagesu', 'melaku'],
      ['nafkot', 'beya'],
    ],
  },
}

function matchId(day: Day, p1: string, p2: string): string {
  const sorted = [p1, p2].sort()
  return `${day}-${sorted[0]}-${sorted[1]}`
}

export function buildGroupMatches(): Match[] {
  const matches: Match[] = []

  for (const [day, groups] of Object.entries(groupSchedule) as [
    Exclude<Day, 'Sun'>,
    (typeof groupSchedule)[Exclude<Day, 'Sun'>],
  ][]) {
    for (const group of ['A', 'B'] as const) {
      for (const [p1, p2] of groups[group]) {
        matches.push({
          id: matchId(day, p1, p2),
          day,
          group,
          player1Id: p1,
          player2Id: p2,
          stage: 'group',
        })
      }
    }
  }

  return matches
}

export const GROUP_MATCHES = buildGroupMatches()

export const DAYS: Day[] = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const DAY_LABELS: Record<Day, string> = {
  Tue: 'Tue',
  Wed: 'Wed',
  Thu: 'Thu',
  Fri: 'Fri',
  Sat: 'Sat',
  Sun: 'Sun',
}
