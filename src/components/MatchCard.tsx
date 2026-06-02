import { useEffect, useState } from 'react'
import { playerName } from '../data/players'
import type { GameScore, Match, Result } from '../types'
import {
  canSubmitMatch,
  computeResult,
  emptyGame,
  isGame3Unlocked,
} from '../utils/scoring'
import { Avatar } from './Avatar'

interface MatchCardProps {
  match: Match
  result?: Result
  locked?: boolean
  readOnly?: boolean
  onSave: (
    g1: GameScore,
    g2: GameScore,
    g3: GameScore | null,
  ) => boolean
  onClear?: () => void
}

function parseScore(value: string): number | null {
  if (value.trim() === '') return null
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? null : n
}

function ScoreDisplay({ g1, g2, g3 }: { g1: GameScore; g2: GameScore; g3: GameScore | null }) {
  const games = [
    { label: 'G1', score: g1 },
    { label: 'G2', score: g2 },
    ...(g3 && g3.p1 !== null ? [{ label: 'G3', score: g3 }] : []),
  ]

  return (
    <div className="space-y-1.5">
      {games.map(({ label, score }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-8 text-xs text-gray-500">{label}</span>
          <div className="flex flex-1 justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold">
            <span>{score.p1 ?? '–'}</span>
            <span className="text-gray-400">–</span>
            <span>{score.p2 ?? '–'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function MatchCard({
  match,
  result,
  locked = false,
  readOnly = false,
  onSave,
  onClear,
}: MatchCardProps) {
  const [g1, setG1] = useState<GameScore>(result?.game1 ?? emptyGame())
  const [g2, setG2] = useState<GameScore>(result?.game2 ?? emptyGame())
  const [g3, setG3] = useState<GameScore | null>(result?.game3 ?? emptyGame())
  const [saved, setSaved] = useState(!!result)

  useEffect(() => {
    if (result) {
      setG1(result.game1)
      setG2(result.game2)
      setG3(result.game3 ?? emptyGame())
      setSaved(true)
    }
  }, [result])

  const game3Unlocked = isGame3Unlocked(g1, g2)
  const canSubmit =
    !readOnly && !locked && canSubmitMatch(g1, g2, game3Unlocked ? g3 : null)
  const preview = canSubmit
    ? computeResult(match.player1Id, match.player2Id, g1, g2, game3Unlocked ? g3 : null)
    : null

  const handleSave = () => {
    const ok = onSave(g1, g2, game3Unlocked ? g3 : null)
    if (ok) setSaved(true)
  }

  const updateGame = (
    game: 1 | 2 | 3,
    player: 'p1' | 'p2',
    value: string,
  ) => {
    setSaved(false)
    const score = parseScore(value)
    if (game === 1) setG1((prev) => ({ ...prev, [player]: score }))
    else if (game === 2) setG2((prev) => ({ ...prev, [player]: score }))
    else setG3((prev) => ({ ...(prev ?? emptyGame()), [player]: score }))
  }

  const p1Name = playerName(match.player1Id)
  const p2Name = playerName(match.player2Id)

  const stageLabel =
    match.stage === 'semifinal'
      ? 'Semi Final'
      : match.stage === 'third_place'
        ? '3rd Place'
        : match.stage === 'final'
          ? 'Final'
          : null

  const isUpcoming = readOnly && !result && !locked

  return (
    <article
      className={`rounded-2xl bg-white p-4 shadow-sm ${
        locked ? 'opacity-60' : ''
      } ${result ? 'ring-2 ring-green-200' : ''}`}
    >
      {stageLabel && (
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-amber-700">
          {stageLabel}
        </p>
      )}

      {isUpcoming && (
        <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-center text-xs font-medium text-blue-800">
          Upcoming
        </p>
      )}

      {locked && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
          Locked until group stage completes
        </p>
      )}

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <Avatar name={p1Name} playerId={match.player1Id} size="xl" />
          <span
            className={`truncate text-center text-sm font-bold ${
              result?.winnerId === match.player1Id ? 'text-green-700' : ''
            }`}
          >
            {p1Name}
          </span>
        </div>
        <span className="shrink-0 text-lg font-bold text-gray-400">vs</span>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <Avatar name={p2Name} playerId={match.player2Id} size="xl" />
          <span
            className={`truncate text-center text-sm font-bold ${
              result?.winnerId === match.player2Id ? 'text-green-700' : ''
            }`}
          >
            {p2Name}
          </span>
        </div>
      </div>

      {readOnly ? (
        result ? (
          <ScoreDisplay g1={result.game1} g2={result.game2} g3={result.game3} />
        ) : (
          !locked && (
            <p className="text-center text-sm text-gray-400">Scores not yet recorded</p>
          )
        )
      ) : (
        <>
          {[1, 2, 3].map((gameNum) => {
            const isG3 = gameNum === 3
            const isGameLocked = isG3 && !game3Unlocked
            const game = gameNum === 1 ? g1 : gameNum === 2 ? g2 : g3 ?? emptyGame()

            return (
              <div
                key={gameNum}
                className={`mb-2 flex items-center gap-2 ${isGameLocked ? 'opacity-40' : ''}`}
              >
                <span className="w-14 shrink-0 text-xs text-gray-500">Game {gameNum}</span>
                <input
                  type="number"
                  min={0}
                  disabled={locked || isGameLocked || (saved && !!result)}
                  value={game.p1 ?? ''}
                  onChange={(e) => updateGame(gameNum as 1 | 2 | 3, 'p1', e.target.value)}
                  placeholder="–"
                  className="w-full rounded-xl bg-gray-100 px-3 py-2 text-center text-sm font-medium outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="number"
                  min={0}
                  disabled={locked || isGameLocked || (saved && !!result)}
                  value={game.p2 ?? ''}
                  onChange={(e) => updateGame(gameNum as 1 | 2 | 3, 'p2', e.target.value)}
                  placeholder="–"
                  className="w-full rounded-xl bg-gray-100 px-3 py-2 text-center text-sm font-medium outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed"
                />
              </div>
            )
          })}
        </>
      )}

      {preview && !saved && !readOnly && (
        <p className="mb-2 text-center text-xs text-gray-500">
          {playerName(preview.winnerId)} wins · {preview.pointsP1}–{preview.pointsP2} pts
        </p>
      )}

      {result && (readOnly || saved) && (
        <p className="mt-2 text-center text-xs font-medium text-green-700">
          ✓ {playerName(result.winnerId)} won ({result.pointsP1}–{result.pointsP2} pts)
          {result.wentToDecider && ' · Decider'}
        </p>
      )}

      {!readOnly && !locked && (
        <div className="mt-3 flex gap-2">
          {canSubmit && !(saved && result) && (
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Save Score
            </button>
          )}
          {result && onClear && (
            <button
              type="button"
              onClick={() => {
                onClear()
                setG1(emptyGame())
                setG2(emptyGame())
                setG3(emptyGame())
                setSaved(false)
              }}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Edit
            </button>
          )}
        </div>
      )}
    </article>
  )
}
