import type { Match, Result } from '../types'
import { getMatchResultDisplay } from '../utils/matchResultDisplay'
import type { PlayerResultLine } from '../utils/matchResultDisplay'
import { Avatar } from './Avatar'

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 text-sky-500"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function PlayerRow({
  line,
  compact,
}: {
  line: PlayerResultLine
  compact?: boolean
}) {
  return (
    <div
      className={`flex w-full items-center border-t border-gray-100 first:border-t-0 ${
        compact ? 'gap-2 py-2.5' : 'gap-3 py-3.5'
      }`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="flex w-5 shrink-0 justify-center">
          {line.isWinner ? (
            <CheckIcon />
          ) : (
            <span className="inline-block h-5 w-5" />
          )}
        </div>
        <Avatar
          name={line.name}
          playerId={line.playerId}
          size={compact ? 'sm' : 'md'}
        />
        <span
          className={`truncate font-medium uppercase tracking-wide text-gray-900 ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {line.name}
        </span>
      </div>

      <div
        className={`ml-auto flex shrink-0 items-center ${
          compact ? 'gap-2' : 'gap-2.5'
        }`}
      >
        <span
          className={`font-bold tabular-nums ${
            compact ? 'text-2xl' : 'text-3xl'
          } ${line.isWinner ? 'text-sky-500' : 'text-gray-400'}`}
        >
          {line.gamesWon}
        </span>
        <div
          className={`flex flex-nowrap gap-2 tabular-nums ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {line.gameScores.map((score, i) => (
            <span
              key={i}
              className={
                line.isWinner ? 'text-gray-900' : 'text-gray-400'
              }
            >
              {score}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

interface MatchResultBoardProps {
  match: Match
  result: Result
  compact?: boolean
  className?: string
}

export function MatchResultBoard({
  match,
  result,
  compact = false,
  className = '',
}: MatchResultBoardProps) {
  const display = getMatchResultDisplay(match, result)
  const padX = compact ? 'px-3' : 'px-4'

  return (
    <div
      className={`w-full rounded-xl border border-gray-200 bg-white ${className}`}
    >
      <div
        className={`border-b border-gray-100 ${padX} ${compact ? 'py-2.5' : 'py-3'}`}
      >
        <h3
          className={`font-bold text-gray-900 ${
            compact ? 'text-sm' : 'text-base'
          }`}
        >
          {display.title}
        </h3>
        <p className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
          {display.subtitle}
        </p>
      </div>

      <div className={padX}>
        <PlayerRow line={display.player1} compact={compact} />
        <PlayerRow line={display.player2} compact={compact} />
      </div>
    </div>
  )
}
