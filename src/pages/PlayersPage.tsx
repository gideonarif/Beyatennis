import { useRef, useState } from 'react'
import { GROUP_A_ORDER, GROUP_B_ORDER, playerMap } from '../data/players'
import { Avatar } from '../components/Avatar'
import { PlayerGamesModal } from '../components/PlayerGamesModal'
import { usePlayerProfiles } from '../context/PlayerProfilesContext'
import type { Match, Player, Result } from '../types'
import { getPlayerMatches } from '../utils/playerMatches'

interface PlayersPageProps {
  matches: Match[]
  results: Record<string, Result>
  isAdmin: boolean
}

export function PlayersPage({ matches, results, isAdmin }: PlayersPageProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const { uploadAvatar, isCloudEnabled } = usePlayerProfiles()

  const groupA = GROUP_A_ORDER.map((id) => playerMap[id]).filter(Boolean)
  const groupB = GROUP_B_ORDER.map((id) => playerMap[id]).filter(Boolean)

  const selectedMatches = selectedPlayer
    ? getPlayerMatches(selectedPlayer.id, matches, results)
    : []

  const renderGroup = (title: string, color: string, players: Player[]) => (
    <div className="mb-6">
      <div
        className="mb-3 rounded-lg px-3 py-2 text-center text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {title}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            isAdmin={isAdmin}
            isCloudEnabled={isCloudEnabled}
            onSelect={() => setSelectedPlayer(p)}
            onQuickUpload={uploadAvatar}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div className="px-4 py-4">
      <h1 className="mb-1 text-xl font-bold text-gray-900">Players</h1>
      <p className="mb-4 text-xs text-gray-500">
        Tap a player for points and upcoming games
        {isAdmin && isCloudEnabled && ' · long-press or use modal to upload photo'}
      </p>
      {renderGroup('Group A', '#1565C0', groupA)}
      {renderGroup('Group B', '#2E7D32', groupB)}

      {selectedPlayer && (
        <PlayerGamesModal
          player={selectedPlayer}
          matches={selectedMatches}
          isAdmin={isAdmin}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  )
}

function PlayerCard({
  player,
  isAdmin,
  isCloudEnabled,
  onSelect,
  onQuickUpload,
}: {
  player: Player
  isAdmin: boolean
  isCloudEnabled: boolean
  onSelect: () => void
  onQuickUpload: (playerId: string, file: File) => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    fileRef.current?.click()
  }

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      await onQuickUpload(player.id, file)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="relative flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full flex-col items-center gap-2"
      >
        <Avatar name={player.name} playerId={player.id} size="lg" />
        <span className="font-semibold text-gray-900">{player.name}</span>
      </button>

      {isAdmin && isCloudEnabled && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={uploading}
            className="w-full rounded-lg border border-gray-200 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
        </>
      )}
    </div>
  )
}
