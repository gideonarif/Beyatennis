import { computeGroupStandings } from '../utils/standings'
import { Avatar } from '../components/Avatar'
import type { Result } from '../types'

interface StandingsPageProps {
  results: Record<string, Result>
}

function StandingsTable({
  title,
  color,
  rows,
}: {
  title: string
  color: string
  rows: ReturnType<typeof computeGroupStandings>
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
            {rows.map((row, i) => (
              <tr key={row.playerId} className="border-b border-gray-50">
                <td className="px-3 py-2.5 font-medium text-gray-400">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar name={row.name} playerId={row.playerId} size="sm" />
                    <span className="font-semibold">{row.name}</span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center">{row.played}</td>
                <td className="px-2 py-2.5 text-center text-green-700">{row.wins}</td>
                <td className="px-2 py-2.5 text-center text-red-600">{row.losses}</td>
                <td className="px-2 py-2.5 text-center font-bold">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function StandingsPage({ results }: StandingsPageProps) {
  const groupA = computeGroupStandings('A', results)
  const groupB = computeGroupStandings('B', results)

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-xl font-bold text-gray-900">Standings</h1>
      <StandingsTable title="Group A" color="#1565C0" rows={groupA} />
      <StandingsTable title="Group B" color="#2E7D32" rows={groupB} />
    </div>
  )
}
