import { useEffect, useMemo, useState } from 'react'
import { ChampionBanner } from '../components/ChampionBanner'
import { DaySelector } from '../components/DaySelector'
import { MatchCard } from '../components/MatchCard'
import { useTournamentRuntime } from '../context/ActiveTournamentContext'
import { formatDayLabelForConfig, getKnockoutDay } from '../tournament/scheduleDays'
import type { Day, Match, Result } from '../types'
import type { GameScore } from '../types'

interface SchedulePageProps {
  matches: Match[]
  results: Record<string, Result>
  groupStageComplete: boolean
  tournamentComplete: boolean
  podium: { first: string; second: string; third: string } | null
  isAdmin: boolean
  onSave: (
    matchId: string,
    p1: string,
    p2: string,
    g1: GameScore,
    g2: GameScore,
    g3: GameScore | null,
    isKnockout: boolean,
  ) => boolean
  onReset: (matchId: string) => void
}

const GROUP_COLORS = ['#1565C0', '#2E7D32', '#6A1B9A', '#E65100', '#00838F', '#AD1457']
const KNOCKOUT_COLOR = '#F57F17'

function groupSectionLabel(group: string): string {
  if (group === 'Knockout') return 'Knockout'
  if (group === 'RR') return 'Round Robin'
  return `Group ${group}`
}

function collectScheduleDays(configDays: Day[], matches: Match[]): Day[] {
  const seen = new Set<Day>()
  const ordered: Day[] = []

  for (const day of configDays) {
    if (!seen.has(day)) {
      seen.add(day)
      ordered.push(day)
    }
  }

  for (const match of matches) {
    if (!seen.has(match.day)) {
      seen.add(match.day)
      ordered.push(match.day)
    }
  }

  return ordered
}

export function SchedulePage({
  matches,
  results,
  groupStageComplete,
  tournamentComplete,
  podium,
  isAdmin,
  onSave,
  onReset,
}: SchedulePageProps) {
  const runtime = useTournamentRuntime()
  const readOnly = !isAdmin

  const scheduleDays = useMemo(
    () => collectScheduleDays(runtime.config.scheduleDays, matches),
    [runtime.config.scheduleDays, matches],
  )

  const defaultDay = useMemo(() => {
    const withMatches = scheduleDays.find((d) => matches.some((m) => m.day === d))
    return withMatches ?? scheduleDays[0] ?? 'Tue'
  }, [scheduleDays, matches])

  const [day, setDay] = useState<Day>(defaultDay)

  useEffect(() => {
    if (!scheduleDays.includes(day)) {
      setDay(defaultDay)
    }
  }, [scheduleDays, day, defaultDay])

  const dayMatches = matches.filter((m) => m.day === day)
  const knockout = dayMatches.filter((m) => m.group === 'Knockout')
  const groupIds = runtime.getGroupIds()
  const usesGroupStage = runtime.config.format === 'group_knockout' || runtime.config.format === 'custom'
  const knockoutLocked = usesGroupStage && !groupStageComplete

  const groupSections = groupIds
    .map((group, index) => ({
      group,
      label: groupSectionLabel(group),
      color: GROUP_COLORS[index % GROUP_COLORS.length],
      columnMatches: dayMatches.filter((m) => m.group === group),
    }))
    .filter((section) => section.columnMatches.length > 0)

  const renderMatchList = (columnMatches: Match[], locked: boolean) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {columnMatches.map((match) => (
        <div key={match.id} className="min-w-0">
          <MatchCard
            match={match}
            result={results[match.id]}
            locked={locked}
            readOnly={readOnly}
            onSave={(g1, g2, g3) =>
              onSave(
                match.id,
                match.player1Id,
                match.player2Id,
                g1,
                g2,
                g3,
                match.group === 'Knockout',
              )
            }
            onReset={isAdmin ? () => onReset(match.id) : undefined}
          />
        </div>
      ))}
    </div>
  )

  const renderColumn = (label: string, color: string, columnMatches: Match[], locked: boolean) => (
    <div className="min-w-0 w-full">
      <div
        className="mb-3 rounded-lg px-3 py-2 text-center text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {label}
      </div>
      {renderMatchList(columnMatches, locked)}
    </div>
  )

  const hasAnyMatches = dayMatches.length > 0

  return (
    <div className="min-w-0">
      {tournamentComplete && podium && <ChampionBanner {...podium} />}

      {scheduleDays.length > 0 && (
        <DaySelector
          active={day}
          days={scheduleDays}
          tournamentId={runtime.config.id}
          onChange={setDay}
        />
      )}

      <div className="min-w-0 px-4 pb-4">
        {!hasAnyMatches ? (
          <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-sm">
            No matches scheduled for this day. Try another day above.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {groupSections.map((section) =>
              renderColumn(
                section.label,
                section.color,
                section.columnMatches,
                false,
              ),
            )}

            {knockout.length > 0 && (
              <div>
                {renderColumn(
                  day === getKnockoutDay(runtime.config)
                    ? `${formatDayLabelForConfig(day, runtime.config.id)} — Knockout`
                    : 'Knockout',
                  KNOCKOUT_COLOR,
                  knockout,
                  knockoutLocked,
                )}
                {knockoutLocked && (
                  <p className="mt-2 text-center text-sm text-amber-700">
                    Complete all group matches to unlock knockout scoring
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
