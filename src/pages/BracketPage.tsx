import { useTournamentRuntime } from '../context/ActiveTournamentContext'
import { Avatar } from '../components/Avatar'
import type { Match, Result } from '../types'

interface BracketPageProps {
  matches: Match[]
  results: Record<string, Result>
  groupStageComplete: boolean
  qualifiedIds: Set<string>
}

function QualifiedBadge() {
  return (
    <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-950">
      Q
    </span>
  )
}

function BracketPlayer({
  playerId,
  isWinner,
  qualified,
  getPlayerName,
}: {
  playerId: string
  isWinner?: boolean
  qualified?: boolean
  getPlayerName: (id: string) => string
}) {
  const name = getPlayerName(playerId)

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2 py-2 ${
        isWinner ? 'bg-green-50' : 'bg-gray-50'
      }`}
    >
      <Avatar name={name} playerId={playerId} size="md" />
      <span
        className={`min-w-0 flex-1 truncate text-sm font-semibold ${
          isWinner ? 'text-green-700' : 'text-gray-900'
        }`}
      >
        {name}
      </span>
      {qualified && <QualifiedBadge />}
      {isWinner && (
        <span className="shrink-0 text-xs font-bold text-green-600">✓</span>
      )}
    </div>
  )
}

function BracketMatch({
  label,
  match,
  result,
  locked,
  qualifiedIds,
  getPlayerName,
}: {
  label: string
  match?: Match
  result?: Result
  locked?: boolean
  qualifiedIds: Set<string>
  getPlayerName: (id: string) => string
}) {
  if (!match) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-400">
        {label} — TBD
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl bg-white p-4 shadow-sm ${
        locked ? 'opacity-70' : ''
      } ${result ? 'ring-2 ring-green-200' : ''}`}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700">
        {label}
      </p>
      <div className="flex flex-col gap-2">
        <BracketPlayer
          playerId={match.player1Id}
          isWinner={result?.winnerId === match.player1Id}
          qualified={qualifiedIds.has(match.player1Id)}
          getPlayerName={getPlayerName}
        />
        <p className="text-center text-xs font-medium text-gray-400">vs</p>
        <BracketPlayer
          playerId={match.player2Id}
          isWinner={result?.winnerId === match.player2Id}
          qualified={qualifiedIds.has(match.player2Id)}
          getPlayerName={getPlayerName}
        />
      </div>
      {locked && (
        <p className="mt-3 text-center text-xs text-amber-600">
          Scoring locked until group stage completes
        </p>
      )}
      {!locked && !result && (
        <p className="mt-3 text-center text-xs text-gray-400">Awaiting result</p>
      )}
    </div>
  )
}

export function BracketPage({
  matches,
  results,
  groupStageComplete,
  qualifiedIds,
}: BracketPageProps) {
  const runtime = useTournamentRuntime()
  const getPlayerName = runtime.getPlayerName
  const semis = matches.filter((m) => m.stage === 'semifinal')
  const third = matches.find((m) => m.stage === 'third_place')
  const final = matches.find((m) => m.stage === 'final')
  const topN = runtime.config.qualification?.topNPerGroup ?? 2

  return (
    <div className="px-4 py-4">
      <h1 className="mb-2 text-xl font-bold text-gray-900">Knockout Bracket</h1>

      {!groupStageComplete && runtime.config.format === 'group_knockout' && (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          Bracket shows current standings projection.{' '}
          <span className="font-bold">Q</span> only appears when a player is
          guaranteed top {topN} regardless of remaining group matches.
        </p>
      )}

      <div
        className="mb-3 rounded-lg px-3 py-2 text-center text-sm font-bold text-white"
        style={{ backgroundColor: '#F57F17' }}
      >
        Knockout Stage
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase text-gray-500">Semi Finals</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <BracketMatch
            label="Semi 1"
            match={semis[0]}
            result={semis[0] ? results[semis[0].id] : undefined}
            locked={!groupStageComplete && runtime.config.format === 'group_knockout'}
            qualifiedIds={qualifiedIds}
            getPlayerName={getPlayerName}
          />
          <BracketMatch
            label="Semi 2"
            match={semis[1]}
            result={semis[1] ? results[semis[1].id] : undefined}
            locked={!groupStageComplete && runtime.config.format === 'group_knockout'}
            qualifiedIds={qualifiedIds}
            getPlayerName={getPlayerName}
          />
        </div>

        <p className="text-xs font-semibold uppercase text-gray-500">Placement</p>
        <BracketMatch
          label="3rd Place"
          match={third}
          result={third ? results[third.id] : undefined}
          locked={!groupStageComplete && runtime.config.format === 'group_knockout'}
          qualifiedIds={qualifiedIds}
          getPlayerName={getPlayerName}
        />
        <BracketMatch
          label="Final"
          match={final}
          result={final ? results[final.id] : undefined}
          locked={!groupStageComplete && runtime.config.format === 'group_knockout'}
          qualifiedIds={qualifiedIds}
          getPlayerName={getPlayerName}
        />
      </div>
    </div>
  )
}
