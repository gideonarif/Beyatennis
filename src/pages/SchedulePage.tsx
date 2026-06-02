import { useState } from 'react'
import { ChampionBanner } from '../components/ChampionBanner'
import { DaySelector } from '../components/DaySelector'
import { MatchCard } from '../components/MatchCard'
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
  ) => boolean
  onClear: (matchId: string) => void
}

const GROUP_HEADERS = {
  A: { label: 'Group A', color: '#1565C0' },
  B: { label: 'Group B', color: '#2E7D32' },
  Knockout: { label: 'Knockout', color: '#F57F17' },
}

export function SchedulePage({
  matches,
  results,
  groupStageComplete,
  tournamentComplete,
  podium,
  isAdmin,
  onSave,
  onClear,
}: SchedulePageProps) {
  const readOnly = !isAdmin
  const [day, setDay] = useState<Day>('Tue')

  const dayMatches = matches.filter((m) => m.day === day)
  const isSunday = day === 'Sun'

  const groupA = dayMatches.filter((m) => m.group === 'A')
  const groupB = dayMatches.filter((m) => m.group === 'B')
  const knockout = dayMatches.filter((m) => m.group === 'Knockout')

  const renderColumn = (label: string, color: string, columnMatches: Match[]) => (
    <div className="flex-1 min-w-0">
      <div
        className="mb-3 rounded-lg px-3 py-2 text-center text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {label}
      </div>
      <div className="flex flex-col gap-3">
        {columnMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            result={results[match.id]}
            locked={match.group === 'Knockout' && !groupStageComplete}
            readOnly={readOnly}
            onSave={(g1, g2, g3) =>
              onSave(match.id, match.player1Id, match.player2Id, g1, g2, g3)
            }
            onClear={isAdmin ? () => onClear(match.id) : undefined}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div>
      {tournamentComplete && podium && <ChampionBanner {...podium} />}

      <DaySelector active={day} onChange={setDay} />

      <div className="px-4 pb-4">
        {isSunday ? (
          <div>
            <div
              className="mb-3 rounded-lg px-3 py-2 text-center text-sm font-bold text-white"
              style={{ backgroundColor: GROUP_HEADERS.Knockout.color }}
            >
              Sunday — Knockout Stage
            </div>
            {!groupStageComplete && (
              <p className="mb-3 text-center text-sm text-amber-700">
                Complete all group matches (Tue–Sat) to unlock knockout
              </p>
            )}
            <div className="flex flex-col gap-3">
              {knockout.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  result={results[match.id]}
                  locked={!groupStageComplete}
                  readOnly={readOnly}
                  onSave={(g1, g2, g3) =>
                    onSave(match.id, match.player1Id, match.player2Id, g1, g2, g3)
                  }
                  onClear={isAdmin ? () => onClear(match.id) : undefined}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row">
            {renderColumn(
              GROUP_HEADERS.A.label,
              GROUP_HEADERS.A.color,
              groupA,
            )}
            {renderColumn(
              GROUP_HEADERS.B.label,
              GROUP_HEADERS.B.color,
              groupB,
            )}
          </div>
        )}
      </div>
    </div>
  )
}
