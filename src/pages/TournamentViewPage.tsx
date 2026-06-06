import { useMemo, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { RoleToggle } from '../components/RoleToggle'
import { ActiveTournamentProvider, useTournamentRuntime } from '../context/ActiveTournamentContext'
import { usePlayerProfiles } from '../context/PlayerProfilesContext'
import { useTournament } from '../hooks/useTournament'
import { BracketPage } from './BracketPage'
import { PlayersPage } from './PlayersPage'
import { SchedulePage } from './SchedulePage'
import { StandingsPage } from './StandingsPage'
import type { Tab } from '../types'
import type { TournamentConfig } from '../types/tournament'
import { getVisibleTabs } from '../tournament/runtime'
import { getGuaranteedQualifiedPlayerIds } from '../utils/qualification'

interface TournamentViewPageProps {
  config: TournamentConfig
  isAdmin: boolean
  role: 'admin' | 'viewer'
  onRequestRole: (role: 'admin' | 'viewer') => void
  onBack: () => void
  onEdit?: () => void
}

function TournamentViewInner({
  isAdmin,
  role,
  onRequestRole,
  onBack,
  onEdit,
}: Omit<TournamentViewPageProps, 'config'>) {
  const runtime = useTournamentRuntime()
  const visibleTabs = useMemo(
    () => getVisibleTabs(runtime.config.format),
    [runtime.config.format],
  )
  const [tab, setTab] = useState<Tab>(visibleTabs[0] ?? 'schedule')

  const {
    results,
    matches,
    groupStageComplete,
    tournamentComplete,
    podium,
    loading,
    syncError,
    isCloudEnabled,
    saveResult,
    clearResult,
  } = useTournament(runtime)
  const { error: profileError } = usePlayerProfiles()

  const qualifiedIds = useMemo(() => {
    if (tab !== 'standings' && tab !== 'bracket') return new Set<string>()
    if (runtime.config.format !== 'group_knockout') return new Set<string>()
    return getGuaranteedQualifiedPlayerIds(runtime, results)
  }, [results, tab, runtime])

  const activeTab = visibleTabs.includes(tab) ? tab : visibleTabs[0]

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg overflow-x-hidden bg-[#f0f2f5] pb-20 md:max-w-3xl lg:max-w-5xl">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="Back to tournaments"
            >
              ←
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-gray-900">
                {runtime.config.name}
              </h1>
              <p className="text-xs text-gray-500">
                {isAdmin ? 'Admin · enter scores' : 'Viewer · live results'}
                {isCloudEnabled && ' · cloud sync'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isAdmin && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
              >
                Edit
              </button>
            )}
            <RoleToggle role={role} onRequestRole={onRequestRole} />
          </div>
        </div>
      </header>

      {(loading || syncError || profileError) && (
        <div className="px-4 pt-2">
          {loading && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-center text-xs text-blue-800">
              Syncing scores…
            </p>
          )}
          {syncError && (
            <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-700">
              {syncError}
            </p>
          )}
          {profileError && (
            <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-700">
              {profileError}
            </p>
          )}
        </div>
      )}

      <main className="min-w-0">
        {!loading && activeTab === 'schedule' && (
          <SchedulePage
            matches={matches}
            results={results}
            groupStageComplete={groupStageComplete}
            tournamentComplete={tournamentComplete}
            podium={podium}
            isAdmin={isAdmin}
            onSave={(matchId, p1, p2, g1, g2, g3, isKnockout) =>
              saveResult(matchId, p1, p2, g1, g2, g3, isAdmin, isKnockout)
            }
            onReset={clearResult}
          />
        )}
        {!loading && activeTab === 'standings' && (
          <StandingsPage results={results} qualifiedIds={qualifiedIds} />
        )}
        {!loading && activeTab === 'bracket' && (
          <BracketPage
            matches={matches}
            results={results}
            groupStageComplete={groupStageComplete}
            qualifiedIds={qualifiedIds}
          />
        )}
        {!loading && activeTab === 'players' && (
          <PlayersPage matches={matches} results={results} isAdmin={isAdmin} />
        )}
      </main>

      <BottomNav
        active={activeTab}
        visibleTabs={visibleTabs}
        onChange={setTab}
      />
    </div>
  )
}

export function TournamentViewPage(props: TournamentViewPageProps) {
  return (
    <ActiveTournamentProvider key={props.config.updatedAt} config={props.config}>
      <TournamentViewInner
        isAdmin={props.isAdmin}
        role={props.role}
        onRequestRole={props.onRequestRole}
        onBack={props.onBack}
        onEdit={props.onEdit}
      />
    </ActiveTournamentProvider>
  )
}
