import { useState } from 'react'
import { AdminPasswordModal } from './components/AdminPasswordModal'
import { BottomNav } from './components/BottomNav'
import { RoleToggle } from './components/RoleToggle'
import { usePlayerProfiles } from './context/PlayerProfilesContext'
import { useRole } from './hooks/useRole'
import { useTournament } from './hooks/useTournament'
import { BracketPage } from './pages/BracketPage'
import { PlayersPage } from './pages/PlayersPage'
import { SchedulePage } from './pages/SchedulePage'
import { StandingsPage } from './pages/StandingsPage'
import type { Tab } from './types'

function App() {
  const [tab, setTab] = useState<Tab>('schedule')
  const {
    role,
    isAdmin,
    showPasswordModal,
    passwordError,
    requestRole,
    unlockAdmin,
    cancelPasswordModal,
  } = useRole()
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
  } = useTournament()
  const { error: profileError } = usePlayerProfiles()

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[#f0f2f5] pb-20">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-gray-900">🏓 TT Tournament</h1>
            <p className="text-xs text-gray-500">
              {isAdmin ? 'Admin · enter scores' : 'Viewer · live results'}
              {isCloudEnabled && ' · cloud sync'}
            </p>
          </div>
          <RoleToggle role={role} onRequestRole={requestRole} />
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

      {showPasswordModal && (
        <AdminPasswordModal
          error={passwordError}
          onSubmit={unlockAdmin}
          onCancel={cancelPasswordModal}
        />
      )}

      <main>
        {!loading && tab === 'schedule' && (
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
          />
        )}
        {!loading && tab === 'standings' && <StandingsPage results={results} />}
        {!loading && tab === 'bracket' && (
          <BracketPage
            matches={matches}
            results={results}
            groupStageComplete={groupStageComplete}
          />
        )}
        {!loading && tab === 'players' && (
          <PlayersPage matches={matches} results={results} isAdmin={isAdmin} />
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}

export default App
