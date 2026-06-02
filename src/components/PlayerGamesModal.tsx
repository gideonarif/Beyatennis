import { playerName } from '../data/players'
import { usePlayerProfiles } from '../context/PlayerProfilesContext'
import type { Player } from '../types'
import type { PlayerMatchRow } from '../utils/playerMatches'
import { Avatar } from './Avatar'
import { ProfilePhotoUpload } from './ProfilePhotoUpload'

interface PlayerGamesModalProps {
  player: Player
  matches: PlayerMatchRow[]
  isAdmin: boolean
  onClose: () => void
}

function stageLabel(stage: PlayerMatchRow['match']['stage']): string | null {
  if (stage === 'semifinal') return 'Semi Final'
  if (stage === 'third_place') return '3rd Place'
  if (stage === 'final') return 'Final'
  return null
}

export function PlayerGamesModal({
  player,
  matches,
  isAdmin,
  onClose,
}: PlayerGamesModalProps) {
  const { uploadAvatar, removeAvatar, isCloudEnabled } = usePlayerProfiles()
  const played = matches.filter((m) => !m.isUpcoming)
  const upcoming = matches.filter((m) => m.isUpcoming)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85dvh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-modal-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar name={player.name} playerId={player.id} size="lg" />
            <div>
              <h2 id="player-modal-title" className="text-lg font-bold text-gray-900">
                {player.name}
              </h2>
              <p className="text-xs text-gray-500">Group {player.group}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: 'calc(85dvh - 4rem)' }}>
          {isCloudEnabled ? (
            <ProfilePhotoUpload
              playerId={player.id}
              playerName={player.name}
              isAdmin={isAdmin}
              onUpload={(file) => uploadAvatar(player.id, file)}
              onRemove={() => removeAvatar(player.id)}
            />
          ) : (
            isAdmin && (
              <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Connect Supabase to upload profile photos (see README).
              </p>
            )
          )}

          {upcoming.length > 0 && (
            <section className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Upcoming
              </h3>
              <ul className="space-y-2">
                {upcoming.map((row) => {
                  const extra = stageLabel(row.match.stage)
                  return (
                    <li
                      key={row.match.id}
                      className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-amber-800">
                          {row.dayLabel}
                          {extra && ` · ${extra}`}
                        </span>
                        <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-medium text-amber-900">
                          Upcoming
                        </span>
                      </div>
                      <p className="mt-1 font-semibold text-gray-900">
                        vs {row.opponentName}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {played.length > 0 ? 'Results' : 'Matches'}
            </h3>
            {played.length === 0 && upcoming.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">No matches scheduled</p>
            )}
            <ul className="space-y-2">
              {played.map((row) => {
                const extra = stageLabel(row.match.stage)
                const result = row.result!
                const winnerName = playerName(result.winnerId)

                return (
                  <li
                    key={row.match.id}
                    className={`rounded-xl border px-3 py-2.5 ${
                      row.won
                        ? 'border-green-100 bg-green-50/50'
                        : 'border-gray-100 bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-gray-500">
                        {row.dayLabel}
                        {extra && ` · ${extra}`}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          row.won ? 'text-green-700' : 'text-red-600'
                        }`}
                      >
                        {row.won ? 'W' : 'L'} · {row.matchPoints} pts
                      </span>
                    </div>
                    <p className="mt-1 font-semibold text-gray-900">vs {row.opponentName}</p>
                    <p className="mt-0.5 text-sm text-gray-600">
                      Games: {row.scoreSummary}
                    </p>
                    <p className="text-xs text-gray-400">{winnerName} won the match</p>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
