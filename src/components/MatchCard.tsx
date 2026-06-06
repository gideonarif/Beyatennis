import { useEffect, useState } from 'react'
import { playerName } from '../data/players'
import type { GameScore, Match, Result } from '../types'
import {
  canSubmitMatch,
  computeResult,
  emptyGame,
  isGame3Unlocked,
} from '../utils/scoring'
import { MatchPlayersFaceoff } from './MatchPlayersFaceoff'
import { MatchResultBoard } from './MatchResultBoard'

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
  onReset?: () => void
}

function parseScore(value: string): number | null {
  if (value.trim() === '') return null
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? null : n
}

function scoresMatch(a: GameScore, b: GameScore): boolean {
  return a.p1 === b.p1 && a.p2 === b.p2
}

export function MatchCard({
  match,
  result,
  locked = false,
  readOnly = false,
  onSave,
  onReset,
}: MatchCardProps) {
  const [g1, setG1] = useState<GameScore>(result?.game1 ?? emptyGame())
  const [g2, setG2] = useState<GameScore>(result?.game2 ?? emptyGame())
  const [g3, setG3] = useState<GameScore | null>(result?.game3 ?? emptyGame())
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (result) {
      setG1(result.game1)
      setG2(result.game2)
      setG3(result.game3 ?? emptyGame())
      setIsEditing(false)
    } else {
      setG1(emptyGame())
      setG2(emptyGame())
      setG3(emptyGame())
      setIsEditing(false)
    }
  }, [result])

  const game3Unlocked = isGame3Unlocked(g1, g2)
  const canSubmit =
    !readOnly && !locked && canSubmitMatch(g1, g2, game3Unlocked ? g3 : null)
  const isKnockout = match.group === 'Knockout'
  const preview = canSubmit
    ? computeResult(
        match.player1Id,
        match.player2Id,
        g1,
        g2,
        game3Unlocked ? g3 : null,
        isKnockout,
      )
    : null

  const showResultBoard = result && !isEditing
  const isDirty =
    isEditing &&
    result &&
    (!scoresMatch(g1, result.game1) ||
      !scoresMatch(g2, result.game2) ||
      !scoresMatch(g3 ?? emptyGame(), result.game3 ?? emptyGame()))

  const handleSave = () => {
    const ok = onSave(g1, g2, game3Unlocked ? g3 : null)
    if (ok) setIsEditing(false)
  }

  const handleEditScore = () => {
    if (result) {
      setG1(result.game1)
      setG2(result.game2)
      setG3(result.game3 ?? emptyGame())
    }
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    if (result) {
      setG1(result.game1)
      setG2(result.game2)
      setG3(result.game3 ?? emptyGame())
    }
    setIsEditing(false)
  }

  const handleResetMatch = () => {
    if (
      !window.confirm(
        'Reset this match? All scores will be cleared and must be re-entered.',
      )
    ) {
      return
    }
    onReset?.()
    setG1(emptyGame())
    setG2(emptyGame())
    setG3(emptyGame())
    setIsEditing(false)
  }

  const updateGame = (
    game: 1 | 2 | 3,
    player: 'p1' | 'p2',
    value: string,
  ) => {
    const score = parseScore(value)
    if (game === 1) setG1((prev) => ({ ...prev, [player]: score }))
    else if (game === 2) setG2((prev) => ({ ...prev, [player]: score }))
    else setG3((prev) => ({ ...(prev ?? emptyGame()), [player]: score }))
  }

  const p1Name = playerName(match.player1Id)
  const p2Name = playerName(match.player2Id)

  const isUpcoming = readOnly && !result && !locked

  const stageLabel =
    match.stage === 'semifinal'
      ? 'Semi Final'
      : match.stage === 'third_place'
        ? '3rd Place'
        : match.stage === 'final'
          ? 'Final'
          : null

  const saveLabel = result && isEditing ? 'Save Changes' : 'Save Score'

  return (
    <article
      className={`min-w-0 w-full rounded-2xl bg-white p-4 shadow-sm ${
        locked ? 'opacity-60' : ''
      } ${result && showResultBoard ? 'ring-2 ring-sky-100' : ''}`}
    >
      {isUpcoming && (
        <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-center text-xs font-medium text-blue-800">
          Upcoming
        </p>
      )}

      {locked && !showResultBoard && !isEditing && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
          Locked until group stage completes
        </p>
      )}

      {stageLabel && !showResultBoard && (
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-amber-700">
          {stageLabel}
        </p>
      )}

      {showResultBoard ? (
        <MatchResultBoard match={match} result={result} />
      ) : (
        <>
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500">
            {isKnockout ? stageLabel ?? 'Knockout' : `Group ${match.group}`}
          </p>

          <div className="mb-4">
            <MatchPlayersFaceoff
              player1={{ id: match.player1Id, name: p1Name }}
              player2={{ id: match.player2Id, name: p2Name }}
              size="xl"
              highlightWinnerId={result?.winnerId}
            />
          </div>

          {!readOnly && (
            <>
              {[1, 2, 3].map((gameNum) => {
                const isG3 = gameNum === 3
                const isGameLocked = isG3 && !game3Unlocked
                const game =
                  gameNum === 1 ? g1 : gameNum === 2 ? g2 : (g3 ?? emptyGame())

                return (
                  <div
                    key={gameNum}
                    className={`mb-2 flex items-center gap-2 ${
                      isGameLocked ? 'opacity-40' : ''
                    }`}
                  >
                    <span className="w-14 shrink-0 text-xs text-gray-500">
                      Game {gameNum}
                    </span>
                    <input
                      type="number"
                      min={0}
                      disabled={locked || isGameLocked}
                      value={game.p1 ?? ''}
                      onChange={(e) =>
                        updateGame(gameNum as 1 | 2 | 3, 'p1', e.target.value)
                      }
                      placeholder="–"
                      className="w-full rounded-xl bg-gray-100 px-3 py-2 text-center text-sm font-medium outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed"
                    />
                    <span className="text-gray-400">–</span>
                    <input
                      type="number"
                      min={0}
                      disabled={locked || isGameLocked}
                      value={game.p2 ?? ''}
                      onChange={(e) =>
                        updateGame(gameNum as 1 | 2 | 3, 'p2', e.target.value)
                      }
                      placeholder="–"
                      className="w-full rounded-xl bg-gray-100 px-3 py-2 text-center text-sm font-medium outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed"
                    />
                  </div>
                )
              })}
            </>
          )}

          {readOnly && !result && !locked && (
            <p className="text-center text-sm text-gray-400">
              Scores not yet recorded
            </p>
          )}
        </>
      )}

      {isEditing && isDirty && !readOnly && (
        <p className="mb-2 mt-2 text-center text-xs font-medium text-amber-700">
          Unsaved changes — tap Save Changes to apply
        </p>
      )}

      {preview && (isEditing || !result) && !readOnly && (
        <p className="mb-2 mt-2 text-center text-xs text-gray-500">
          {playerName(preview.winnerId)} wins the match
          {preview.wentToDecider && ' · Decider'}
        </p>
      )}

      {!readOnly && !locked && (
        <div className="mt-3 flex flex-col gap-2">
          {canSubmit && (isEditing || !result) && (
            <button
              type="button"
              onClick={handleSave}
              className="w-full rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {saveLabel}
            </button>
          )}

          {showResultBoard && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleEditScore}
                className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit Score
              </button>
              {onReset && (
                <button
                  type="button"
                  onClick={handleResetMatch}
                  className="flex-1 rounded-xl border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Reset Match
                </button>
              )}
            </div>
          )}

          {isEditing && result && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="w-full rounded-xl border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </article>
  )
}
