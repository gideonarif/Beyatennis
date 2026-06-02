import { Avatar } from './Avatar'

interface MatchPlayersFaceoffProps {
  player1: { id: string; name: string }
  player2: { id: string; name: string }
  size?: 'md' | 'lg' | 'xl'
  highlightWinnerId?: string
}

export function MatchPlayersFaceoff({
  player1,
  player2,
  size = 'lg',
  highlightWinnerId,
}: MatchPlayersFaceoffProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Avatar name={player1.name} playerId={player1.id} size={size} />
        <span
          className={`truncate text-sm font-bold ${
            highlightWinnerId === player1.id ? 'text-green-700' : 'text-gray-900'
          }`}
        >
          {player1.name}
        </span>
      </div>

      <span className="shrink-0 px-1 text-sm font-bold text-gray-400">vs</span>

      <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2">
        <Avatar name={player2.name} playerId={player2.id} size={size} />
        <span
          className={`truncate text-right text-sm font-bold ${
            highlightWinnerId === player2.id ? 'text-green-700' : 'text-gray-900'
          }`}
        >
          {player2.name}
        </span>
      </div>
    </div>
  )
}
