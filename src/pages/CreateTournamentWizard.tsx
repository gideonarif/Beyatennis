import { useMemo, useState } from 'react'
import type {
  CreateTournamentDraft,
  MatchFormat,
  QualificationRule,
  SeedingRule,
  TournamentFormat,
} from '../types/tournament'
import { FORMAT_LABELS, TIEBREAKER_LABELS } from '../types/tournament'
import { syncPlayerRoster } from '../tournament/builder'
import { createEmptyDraft } from '../tournament/runtime'
import { createDefaultScoringRules } from '../tournament/defaults'

interface CreateTournamentWizardProps {
  mode?: 'create' | 'edit'
  initialDraft?: CreateTournamentDraft
  datesLocked?: boolean
  onCancel: () => void
  onComplete: (draft: CreateTournamentDraft) => void
}

const STEPS = [
  'Basic Information',
  'Participants',
  'Tournament Format',
  'Seeding Rules',
  'Group Configuration',
  'Qualification Rules',
  'Match Rules',
  'Points System',
  'Ranking Rules',
]

const FORMATS: TournamentFormat[] = [
  'round_robin',
  'group_knockout',
  'single_elimination',
  'double_elimination',
  'swiss',
  'custom',
]

export function CreateTournamentWizard({
  mode = 'create',
  initialDraft,
  datesLocked = false,
  onCancel,
  onComplete,
}: CreateTournamentWizardProps) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<CreateTournamentDraft>(() => {
    const base = initialDraft ?? createEmptyDraft()
    return {
      ...base,
      playerNames: syncPlayerRoster(base.participantCount, base.playerNames),
    }
  })
  const [bulkPaste, setBulkPaste] = useState('')

  const needsGroups = ['group_knockout', 'swiss', 'custom'].includes(draft.format)
  const needsQualification = draft.format === 'group_knockout' || draft.format === 'custom'
  const isEdit = mode === 'edit'

  const roster = useMemo(
    () => syncPlayerRoster(draft.participantCount, draft.playerNames),
    [draft.participantCount, draft.playerNames],
  )

  const visibleSteps = useMemo(() => {
    return STEPS.filter((_, i) => {
      if (i === 4 && !needsGroups) return false
      if (i === 5 && !needsQualification) return false
      return true
    })
  }, [needsGroups, needsQualification])

  const stepIndex = visibleSteps.indexOf(STEPS[step]) >= 0
    ? visibleSteps.indexOf(STEPS[step])
    : Math.min(step, visibleSteps.length - 1)

  const currentLabel = visibleSteps[stepIndex] ?? visibleSteps[0]

  const patch = (partial: Partial<CreateTournamentDraft>) => {
    setDraft((d) => ({ ...d, ...partial }))
  }

  const setParticipantCount = (count: number) => {
    const next = Math.min(64, Math.max(2, count))
    patch({
      participantCount: next,
      playerNames: syncPlayerRoster(next, draft.playerNames),
    })
  }

  const updatePlayerName = (index: number, name: string) => {
    const next = syncPlayerRoster(draft.participantCount, draft.playerNames)
    next[index] = name
    patch({ playerNames: next })
  }

  const removePlayerAt = (index: number) => {
    if (draft.participantCount <= 2) return
    const next = syncPlayerRoster(draft.participantCount, draft.playerNames)
    next.splice(index, 1)
    patch({
      participantCount: draft.participantCount - 1,
      playerNames: next,
    })
  }

  const addPlayerSlot = () => {
    if (draft.participantCount >= 64) return
    const nextCount = draft.participantCount + 1
    patch({
      participantCount: nextCount,
      playerNames: syncPlayerRoster(nextCount, draft.playerNames),
    })
  }

  const applyBulkPaste = () => {
    const lines = bulkPaste
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length === 0) return

    const count = Math.min(64, Math.max(2, lines.length))
    patch({
      participantCount: count,
      playerNames: syncPlayerRoster(count, lines),
    })
    setBulkPaste('')
  }

  const isLastStep =
    step === 8 ||
    (step === 7 && !needsGroups && !needsQualification) ||
    (step === 6 && !needsGroups && !needsQualification) ||
    (step === 5 && !needsGroups && !needsQualification)

  const goNext = () => {
    if (isLastStep) {
      onComplete({
        ...draft,
        playerNames: syncPlayerRoster(draft.participantCount, draft.playerNames),
      })
      return
    }
    let s = step + 1
    while (s < STEPS.length) {
      if (s === 4 && !needsGroups) { s++; continue }
      if (s === 5 && !needsQualification) { s++; continue }
      break
    }
    if (s >= STEPS.length) {
      onComplete({
        ...draft,
        playerNames: syncPlayerRoster(draft.participantCount, draft.playerNames),
      })
    } else setStep(s)
  }

  const goBack = () => {
    let s = step - 1
    while (s >= 0) {
      if (s === 5 && !needsQualification) { s--; continue }
      if (s === 4 && !needsGroups) { s--; continue }
      break
    }
    if (s < 0) onCancel()
    else setStep(s)
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <Field label="Tournament Name">
              <input
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                className={inputClass}
                placeholder="Hawassa Open Championship"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                className={`${inputClass} min-h-20`}
                placeholder="Tournament details…"
              />
            </Field>
            <Field label="Banner image URL (optional)">
              <input
                value={draft.imageUrl ?? ''}
                onChange={(e) => patch({ imageUrl: e.target.value || null })}
                className={inputClass}
                placeholder="https://…"
              />
            </Field>
            <Field label="Sport Type">
              <input
                value={draft.sportType}
                onChange={(e) => patch({ sportType: e.target.value })}
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date">
                <input
                  type="date"
                  value={draft.startDate}
                  disabled={datesLocked}
                  onChange={(e) => patch({ startDate: e.target.value })}
                  className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500`}
                />
              </Field>
              <Field label="End Date">
                <input
                  type="date"
                  value={draft.endDate}
                  disabled={datesLocked}
                  onChange={(e) => patch({ endDate: e.target.value })}
                  className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500`}
                />
              </Field>
            </div>
            {datesLocked && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Dates cannot be changed after the first match has been scored. You can still
                update the name, description, and other settings.
              </p>
            )}
          </div>
        )

      case 1:
        return (
          <div className="space-y-4">
            <Field label="Participant Type">
              <select
                value={draft.participantType}
                onChange={(e) =>
                  patch({
                    participantType: e.target.value as CreateTournamentDraft['participantType'],
                  })
                }
                className={inputClass}
              >
                <option value="individual">Individual Players</option>
                <option value="team">Teams</option>
              </select>
            </Field>

            <Field label="Number of Participants">
              <input
                type="number"
                min={2}
                max={64}
                value={draft.participantCount}
                onChange={(e) => setParticipantCount(Number(e.target.value) || 2)}
                className={inputClass}
              />
            </Field>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Player roster ({roster.length})
                </span>
                <button
                  type="button"
                  onClick={addPlayerSlot}
                  disabled={draft.participantCount >= 64}
                  className="text-xs font-semibold text-blue-600 disabled:opacity-40"
                >
                  + Add player
                </button>
              </div>
              <ul className="space-y-2">
                {roster.map((name, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-center text-xs font-bold text-gray-400">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => updatePlayerName(index, e.target.value)}
                      className={inputClass}
                      placeholder={`Player ${index + 1}`}
                      aria-label={`Player ${index + 1} name`}
                    />
                    <button
                      type="button"
                      onClick={() => removePlayerAt(index)}
                      disabled={draft.participantCount <= 2}
                      className="shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-30"
                      aria-label={`Remove player ${index + 1}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <Field label="Import names (one per line)">
              <textarea
                value={bulkPaste}
                onChange={(e) => setBulkPaste(e.target.value)}
                className={`${inputClass} min-h-24 font-mono text-xs`}
                placeholder={'Alice\nBob\nCarlos\n…'}
              />
              <button
                type="button"
                onClick={applyBulkPaste}
                disabled={!bulkPaste.trim()}
                className={`mt-2 w-full ${btnSecondary}`}
              >
                Apply imported names
              </button>
            </Field>

            <p className="text-xs text-gray-500">
              Edit each name directly, adjust the count, add/remove players, or paste a list to
              fill the roster quickly.
            </p>
          </div>
        )

      case 2:
        return (
          <div className="space-y-3">
            {FORMATS.map((format) => (
              <label
                key={format}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                  draft.format === format
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  checked={draft.format === format}
                  onChange={() => patch({ format })}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-gray-900">{FORMAT_LABELS[format]}</p>
                  <p className="text-xs text-gray-500">{formatDescription(format)}</p>
                </div>
              </label>
            ))}
          </div>
        )

      case 3:
        return (
          <div className="space-y-3">
            {(
              [
                ['random', 'Random Assignment'],
                ['manual', 'Manual Seeding'],
                ['previous_ranking', 'Previous Tournament Ranking'],
                ['rating', 'Rating-Based Seeding'],
              ] as [SeedingRule, string][]
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                  draft.seeding === value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="seeding"
                  checked={draft.seeding === value}
                  onChange={() => patch({ seeding: value })}
                />
                <span className="font-medium">{label}</span>
              </label>
            ))}
            <p className="text-xs text-gray-500">
              Serpentine seeding distributes strong players across groups automatically.
            </p>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Number of Groups">
                <input
                  type="number"
                  min={2}
                  max={8}
                  value={draft.groupCount}
                  onChange={(e) => patch({ groupCount: Number(e.target.value) || 2 })}
                  className={inputClass}
                />
              </Field>
              <Field label="Players per Group">
                <input
                  type="number"
                  min={2}
                  max={16}
                  value={draft.playersPerGroup}
                  onChange={(e) => patch({ playersPerGroup: Number(e.target.value) || 4 })}
                  className={inputClass}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.autoBalanceGroups}
                onChange={(e) => patch({ autoBalanceGroups: e.target.checked })}
              />
              Auto balance groups (serpentine seeding)
            </label>
            {!draft.autoBalanceGroups && (
              <p className="text-xs text-amber-700">
                Manual group assignment can be configured after creation.
              </p>
            )}
          </div>
        )

      case 5:
        return (
          <div className="space-y-3">
            {(
              [
                ['top_1', 'Top 1 from each group'],
                ['top_2', 'Top 2 from each group'],
                ['top_3', 'Top 3 from each group'],
                ['best_runners_up', 'Best runners-up'],
                ['custom', 'Custom qualification logic'],
              ] as [QualificationRule, string][]
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                  draft.qualificationRule === value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="qualification"
                  checked={draft.qualificationRule === value}
                  onChange={() => {
                    const topN = value === 'top_1' ? 1 : value === 'top_3' ? 3 : 2
                    patch({ qualificationRule: value, topNPerGroup: topN })
                  }}
                />
                <span className="font-medium">{label}</span>
              </label>
            ))}
            <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              Knockout pairing: A1 vs B2, B1 vs A2 (cross format) when two groups qualify top 2.
            </p>
          </div>
        )

      case 6:
        return (
          <div className="space-y-3">
            {(
              [
                ['best_of_1', 'Best of 1'],
                ['best_of_3', 'Best of 3'],
                ['best_of_5', 'Best of 5'],
                ['best_of_7', 'Best of 7'],
              ] as [MatchFormat, string][]
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                  draft.matchFormat === value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="matchFormat"
                  checked={draft.matchFormat === value}
                  onChange={() =>
                    patch({
                      matchFormat: value,
                      scoringRules: createDefaultScoringRules(value),
                    })
                  }
                />
                <span className="font-medium">{label}</span>
              </label>
            ))}
          </div>
        )

      case 7:
        return (
          <div className="space-y-4">
            {draft.scoringRules.pointsRules.map((rule, i) => (
              <div key={rule.id} className="rounded-xl border border-gray-200 p-3">
                <p className="mb-2 text-sm font-semibold">{rule.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Winner points">
                    <input
                      type="number"
                      min={0}
                      value={rule.winnerPoints}
                      onChange={(e) => {
                        const rules = [...draft.scoringRules.pointsRules]
                        rules[i] = { ...rules[i], winnerPoints: Number(e.target.value) }
                        patch({ scoringRules: { ...draft.scoringRules, pointsRules: rules } })
                      }}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Loser points">
                    <input
                      type="number"
                      min={0}
                      value={rule.loserPoints}
                      onChange={(e) => {
                        const rules = [...draft.scoringRules.pointsRules]
                        rules[i] = { ...rules[i], loserPoints: Number(e.target.value) }
                        patch({ scoringRules: { ...draft.scoringRules, pointsRules: rules } })
                      }}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500">
              Custom scoring rules support any sport — configure sweep vs decider outcomes above.
            </p>
          </div>
        )

      case 8:
        return (
          <div className="space-y-2">
            <p className="mb-2 text-xs text-gray-500">
              Drag priority order for tie-breakers (first = highest priority).
            </p>
            {draft.tiebreakers.map((criterion, index) => (
              <div
                key={criterion}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2"
              >
                <span className="w-6 text-center text-xs font-bold text-gray-400">
                  {index + 1}
                </span>
                <span className="flex-1 text-sm font-medium">
                  {TIEBREAKER_LABELS[criterion]}
                </span>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...draft.tiebreakers]
                    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                    patch({ tiebreakers: next })
                  }}
                  className="text-xs text-blue-600 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === draft.tiebreakers.length - 1}
                  onClick={() => {
                    const next = [...draft.tiebreakers]
                    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
                    patch({ tiebreakers: next })
                  }}
                  className="text-xs text-blue-600 disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[#f0f2f5]">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white px-4 py-4">
        <button type="button" onClick={onCancel} className="mb-2 text-sm text-gray-500">
          ← Cancel
        </button>
        <h1 className="text-lg font-bold text-gray-900">
          {isEdit ? 'Edit Tournament' : 'Create Tournament'}
        </h1>
        <p className="text-xs text-gray-500">
          Step {stepIndex + 1} of {visibleSteps.length}: {currentLabel}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${((stepIndex + 1) / visibleSteps.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="px-4 py-4 pb-28">{renderStep()}</main>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg gap-3">
          <button type="button" onClick={goBack} className={`flex-1 ${btnSecondary}`}>
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <button type="button" onClick={goNext} className={`flex-1 ${btnPrimary}`}>
            {isLastStep ? (isEdit ? 'Save Changes' : 'Create Tournament') : 'Continue'}
          </button>
        </div>
      </footer>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400'
const btnPrimary =
  'rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700'
const btnSecondary =
  'rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50'

function formatDescription(format: TournamentFormat): string {
  switch (format) {
    case 'round_robin':
      return 'Every participant plays every other participant.'
    case 'group_knockout':
      return 'Groups then knockout — top qualifiers advance.'
    case 'single_elimination':
      return 'One loss eliminates the participant.'
    case 'double_elimination':
      return 'Must lose twice before elimination.'
    case 'swiss':
      return 'Players matched by similar scores each round.'
    case 'custom':
      return 'Organizer manually configures rules.'
    default:
      return ''
  }
}
