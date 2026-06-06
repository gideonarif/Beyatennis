import type { Day } from '../types'
import type { TournamentConfig, TournamentFormat } from '../types/tournament'
import { SEED_TOURNAMENT_ID, SEED_WEEKDAY_DATES } from '../data/seedTournament'

const MAX_ROUNDS_PER_PLAYER_PER_DAY = 2

/** Format a local calendar date as YYYY-MM-DD (avoids UTC shift from toISOString). */
export function formatLocalDateIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDayLabel(day: Day): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const labels: Record<string, string> = {
    Mon: 'Mon',
    Tue: 'Tue',
    Wed: 'Wed',
    Thu: 'Thu',
    Fri: 'Fri',
    Sat: 'Sat',
    Sun: 'Sun',
  }
  return labels[day] ?? day
}

export function formatDayLabelForConfig(day: Day, tournamentId?: string): string {
  if (tournamentId === SEED_TOURNAMENT_ID && SEED_WEEKDAY_DATES[day]) {
    return formatDayLabel(SEED_WEEKDAY_DATES[day])
  }
  return formatDayLabel(day)
}

export function tournamentDaySpan(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (end < start) return 1
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
}

export function buildDaysFromDateRange(
  startDate: string,
  endDate: string,
  reserveLastForKnockout: boolean,
): { groupDays: Day[]; knockoutDay: Day | null; allDays: Day[] } {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const allDays: Day[] = []

  if (end < start) {
    const iso = startDate.slice(0, 10)
    return { groupDays: [iso], knockoutDay: null, allDays: [iso] }
  }

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    allDays.push(formatLocalDateIso(cursor))
  }

  if (reserveLastForKnockout && allDays.length > 1) {
    return {
      groupDays: allDays.slice(0, -1),
      knockoutDay: allDays[allDays.length - 1],
      allDays,
    }
  }

  return { groupDays: allDays, knockoutDay: null, allDays }
}

export function formatUsesKnockoutDay(format: TournamentFormat): boolean {
  return format === 'group_knockout' || format === 'custom'
}

export function getKnockoutDay(config: Pick<TournamentConfig, 'scheduleDays' | 'format'>): Day {
  if (formatUsesKnockoutDay(config.format) && config.scheduleDays.length > 0) {
    return config.scheduleDays[config.scheduleDays.length - 1]
  }
  return config.scheduleDays[config.scheduleDays.length - 1] ?? 'Sun'
}

/**
 * Plan how many round-robin rounds to play on each day (max 2 rounds/day per player).
 * Spreads rounds evenly across the available group-stage days.
 */
export function planRoundsPerDay(numRounds: number, numDays: number): number[] {
  if (numDays <= 0 || numRounds <= 0) return []

  const days = new Array<number>(numDays).fill(0)
  const maxPerDay = MAX_ROUNDS_PER_PLAYER_PER_DAY

  if (numRounds <= numDays) {
    for (let round = 0; round < numRounds; round++) {
      const dayIndex = Math.floor((round * numDays) / numRounds)
      days[dayIndex]++
    }
    return days
  }

  let remaining = numRounds
  for (let dayIndex = 0; dayIndex < numDays && remaining > 0; dayIndex++) {
    const slotsLeft = numDays - dayIndex
    const roundsToday = Math.min(maxPerDay, Math.ceil(remaining / slotsLeft))
    days[dayIndex] = roundsToday
    remaining -= roundsToday
  }

  return days
}

/** Spread a list of items evenly across available days. */
export function distributeEvenlyAcrossDays<T>(items: T[], days: Day[]): Map<Day, T[]> {
  const buckets = new Map<Day, T[]>()
  for (const day of days) buckets.set(day, [])

  if (days.length === 0) return buckets

  items.forEach((item, index) => {
    const day = days[Math.floor((index * days.length) / items.length)] ?? days[0]
    buckets.get(day)!.push(item)
  })

  return buckets
}

export function expectedScheduleDays(
  startDate: string,
  endDate: string,
  format: TournamentFormat,
): Day[] {
  return buildDaysFromDateRange(startDate, endDate, formatUsesKnockoutDay(format)).allDays
}

export function scheduleDaysMismatch(config: TournamentConfig): boolean {
  const expected = expectedScheduleDays(config.startDate, config.endDate, config.format)
  if (config.scheduleDays.length !== expected.length) return true
  return config.scheduleDays.some((day, index) => day !== expected[index])
}

export { MAX_ROUNDS_PER_PLAYER_PER_DAY }
