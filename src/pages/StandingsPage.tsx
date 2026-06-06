import { useMemo } from 'react'
import { useTournamentRuntime } from '../context/ActiveTournamentContext'
import { Avatar } from '../components/Avatar'
import type { Result, StandingRow } from '../types'
import { computeGroupStandings } from '../utils/standings'

interface StandingsPageProps {
  results: Record<string, Result>
  qualifiedIds: Set<string>
}

const GROUP_COLORS = ['#1565C0', '#2E7D32', '#6A1B9A', '#E65100', '#00838F', '#AD1457']

function QualifiedBadge() {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-950">
      Q
    </span>
  )
}

function StandingsTable({
  title,
  color,
  rows,
  qualifiedIds,
}: {
  title: string
  color: string
  rows: StandingRow[]
  qualifiedIds: Set<string>
}) {
  return (
    <div className="mb-6">
      <div
        className="mb-2 rounded-lg px-3 py-2 text-center text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {title}
      </div>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-2 py-2 text-center">P</th>
              <th className="px-2 py-2 text-center">W</th>
              <th className="px-2 py-2 text-center">L</th>
              <th className="px-2 py-2 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const qualified = qualifiedIds.has(row.playerId)

              return (
                <tr
                  key={row.playerId}
                  className={`border-b border-gray-50 ${
                    qualified ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <td className="px-3 py-2.5 font-medium text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={row.name} playerId={row.playerId} size="sm" />
                      <span className="font-semibold">{row.name}</span>
                      {qualified && <QualifiedBadge />}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-center">{row.played}</td>
                  <td className="px-2 py-2.5 text-center text-green-700">{row.wins}</td>
                  <td className="px-2 py-2.5 text-center text-red-600">{row.losses}</td>
                  <td className="px-2 py-2.5 text-center font-bold">{row.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function StandingsPage({ results, qualifiedIds }: StandingsPageProps) {
  const runtime = useTournamentRuntime()
  const groupIds = runtime.getGroupIds()
  const topN = runtime.config.qualification?.topNPerGroup ?? 2
  const showQualification = runtime.config.format === 'group_knockout'

  const groupStandings = useMemo(
    () =>
      groupIds.map((group) => ({
        group,
        rows: computeGroupStandings(runtime, group, results),
      })),
    [runtime, groupIds, results],
  )

  return (
    <div className="px-4 py-4">
      <h1 className="mb-1 text-xl font-bold text-gray-900">Standings</h1>
      {showQualification && (
        <p className="mb-4 text-xs text-gray-500">
          <span className="font-semibold text-amber-700">Q</span> = mathematically
          guaranteed top {topN} (cannot be displaced by any remaining results)
        </p>
      )}
      {groupStandings.map(({ group, rows }, index) => (
        <StandingsTable
          key={group}
          title={groupIds.length === 1 ? 'Standings' : `Group ${group}`}
          color={GROUP_COLORS[index % GROUP_COLORS.length]}
          rows={rows}
          qualifiedIds={showQualification ? qualifiedIds : new Set()}
        />
      ))}
    </div>
  )
}
