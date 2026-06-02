import { playerName } from '../data/players'
import type { Match, Result } from '../types'

interface BracketPageProps {
  matches: Match[]
  results: Record<string, Result>
  groupStageComplete: boolean
}

function BracketMatch({
  label,
  match,
  result,
  locked,
}: {
  label: string
  match?: Match
  result?: Result
  locked?: boolean
}) {
  if (!match) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-400">
        {label} — TBD
      </div>
    )
  }

  const p1 = playerName(match.player1Id)
  const p2 = playerName(match.player2Id)
  const winner = result ? playerName(result.winnerId) : null

  return (
    <div
      className={`rounded-xl bg-white p-4 shadow-sm ${
        locked ? 'opacity-50' : ''
      } ${winner ? 'ring-2 ring-green-200' : ''}`}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
        {label}
      </p>
      <div className="flex flex-col gap-1">
        <p
          className={`font-semibold ${
            result?.winnerId === match.player1Id ? 'text-green-700' : ''
          }`}
        >
          {p1}
          {result?.winnerId === match.player1Id && ' ✓'}
        </p>
        <p className="text-center text-xs text-gray-400">vs</p>
        <p
          className={`font-semibold ${
            result?.winnerId === match.player2Id ? 'text-green-700' : ''
          }`}
        >
          {p2}
          {result?.winnerId === match.player2Id && ' ✓'}
        </p>
      </div>
      {locked && (
        <p className="mt-2 text-center text-xs text-amber-600">Locked</p>
      )}
      {!locked && !result && (
        <p className="mt-2 text-center text-xs text-gray-400">Awaiting result</p>
      )}
    </div>
  )
}

export function BracketPage({
  matches,
  results,
  groupStageComplete,
}: BracketPageProps) {
  const semis = matches.filter((m) => m.stage === 'semifinal')
  const third = matches.find((m) => m.stage === 'third_place')
  const final = matches.find((m) => m.stage === 'final')

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-xl font-bold text-gray-900">Knockout Bracket</h1>

      {!groupStageComplete && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Complete all group stage matches to generate the bracket.
        </div>
      )}

      <div
        className="mb-3 rounded-lg px-3 py-2 text-center text-sm font-bold text-white"
        style={{ backgroundColor: '#F57F17' }}
      >
        Sunday Knockout
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase text-gray-500">Semi Finals</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <BracketMatch
            label="Semi 1 · A#1 vs B#2"
            match={semis[0]}
            result={semis[0] ? results[semis[0].id] : undefined}
            locked={!groupStageComplete}
          />
          <BracketMatch
            label="Semi 2 · B#1 vs A#2"
            match={semis[1]}
            result={semis[1] ? results[semis[1].id] : undefined}
            locked={!groupStageComplete}
          />
        </div>

        <p className="text-xs font-semibold uppercase text-gray-500">Placement</p>
        <BracketMatch
          label="3rd Place"
          match={third}
          result={third ? results[third.id] : undefined}
          locked={!groupStageComplete}
        />
        <BracketMatch
          label="Final"
          match={final}
          result={final ? results[final.id] : undefined}
          locked={!groupStageComplete}
        />
      </div>
    </div>
  )
}
