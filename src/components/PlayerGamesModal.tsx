import { usePlayerProfiles } from '../context/PlayerProfilesContext'
import type { Player } from '../types'
import type { PlayerMatchRow } from '../utils/playerMatches'
import { Avatar } from './Avatar'
import { MatchPlayersFaceoff } from './MatchPlayersFaceoff'
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

function totalRankingPoints(matches: PlayerMatchRow[]): number {
  return matches.reduce((sum, row) => {
    if (row.isUpcoming || row.match.group === 'Knockout') return sum
    return sum + (row.matchPoints ?? 0)
  }, 0)
}

export function PlayerGamesModal({
  player,
  matches,
  isAdmin,
  onClose,
}: PlayerGamesModalProps) {
  const { uploadAvatar, removeAvatar, isCloudEnabled } = usePlayerProfiles()
  const upcoming = matches.filter((m) => m.isUpcoming)
  const points = totalRankingPoints(matches)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 pb-24 sm:items-center sm:pb-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(85dvh,calc(100dvh-6rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl sm:max-h-[min(85dvh,calc(100dvh-2rem))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-modal-title"
      >
        <header className="relative shrink-0 border-b border-gray-100 px-4 py-4">
          <div className="flex flex-col items-center text-center">
            <Avatar name={player.name} playerId={player.id} size="xxl" />
            <h2 id="player-modal-title" className="mt-3 text-lg font-bold text-gray-900">
              {player.name}
            </h2>
            <p className="text-xs text-gray-500">Group {player.group}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
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

          <section className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Ranking points
            </h3>
            <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-center">
              <p className="text-3xl font-bold tabular-nums text-sky-600">{points}</p>
              <p className="mt-1 text-xs text-gray-500">Earned in group stage so far</p>
            </div>
          </section>

          <section className="pb-2">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
              Upcoming games
              {upcoming.length > 0 && (
                <span className="ml-1.5 font-normal text-gray-400">
                  ({upcoming.length})
                </span>
              )}
            </h3>
            {upcoming.length === 0 ? (
              <p className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-6 text-center text-sm text-gray-400">
                No upcoming matches
              </p>
            ) : (
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
                        <span className="shrink-0 rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-medium text-amber-900">
                          Upcoming
                        </span>
                      </div>
                      <div className="mt-2">
                        <MatchPlayersFaceoff
                          player1={{ id: player.id, name: player.name }}
                          player2={{
                            id: row.opponentId,
                            name: row.opponentName,
                          }}
                          size="md"
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
