import { useState } from 'react'
import { AdminPasswordModal } from './components/AdminPasswordModal'
import { RoleToggle } from './components/RoleToggle'
import { useRole } from './hooks/useRole'
import { useTournaments } from './hooks/useTournaments'
import { CreateTournamentWizard } from './pages/CreateTournamentWizard'
import { TournamentHomePage } from './pages/TournamentHomePage'
import { TournamentViewPage } from './pages/TournamentViewPage'
import { getTournament, hasTournamentStarted } from './services/tournamentStorage'

type AppView = 'home' | 'tournament' | 'create' | 'edit'

function App() {
  const [view, setView] = useState<AppView>('home')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editReturnTo, setEditReturnTo] = useState<'home' | 'tournament'>('home')
  const { summaries, create, updateFromDraft, remove, refresh, configToDraft, loading, syncError, cloudSetupNeeded, isCloudEnabled } = useTournaments()
  const {
    role,
    isAdmin,
    showPasswordModal,
    passwordError,
    requestRole,
    unlockAdmin,
    cancelPasswordModal,
  } = useRole()

  const selectedConfig = selectedId ? getTournament(selectedId) : null

  if (view === 'create') {
    return (
      <CreateTournamentWizard
        mode="create"
        onCancel={() => setView('home')}
        onComplete={async (draft, bannerOptions) => {
          const config = await create(draft, bannerOptions)
          setSelectedId(config.id)
          setView('tournament')
        }}
      />
    )
  }

  if (view === 'edit' && selectedConfig) {
    return (
      <CreateTournamentWizard
        mode="edit"
        initialDraft={configToDraft(selectedConfig)}
        datesLocked={hasTournamentStarted(selectedConfig.id)}
        onCancel={() => {
          setView(editReturnTo === 'tournament' ? 'tournament' : 'home')
        }}
        onComplete={async (draft, bannerOptions) => {
          const config = await updateFromDraft(selectedConfig.id, draft, bannerOptions)
          if (config) {
            setSelectedId(config.id)
            setView(editReturnTo === 'tournament' ? 'tournament' : 'home')
            refresh()
          }
        }}
      />
    )
  }

  if (view === 'tournament' && selectedConfig) {
    return (
      <>
        {showPasswordModal && (
          <AdminPasswordModal
            error={passwordError}
            onSubmit={unlockAdmin}
            onCancel={cancelPasswordModal}
          />
        )}
        <TournamentViewPage
          config={selectedConfig}
          isAdmin={isAdmin}
          role={role}
          onRequestRole={requestRole}
          onBack={() => {
            setView('home')
            setSelectedId(null)
            refresh()
          }}
          onEdit={
            isAdmin
              ? () => {
                  setEditReturnTo('tournament')
                  setView('edit')
                }
              : undefined
          }
        />
      </>
    )
  }

  return (
    <>
      <div className="fixed right-4 top-4 z-50">
        <RoleToggle role={role} onRequestRole={requestRole} />
      </div>

      {showPasswordModal && (
        <AdminPasswordModal
          error={passwordError}
          onSubmit={unlockAdmin}
          onCancel={cancelPasswordModal}
        />
      )}

      <TournamentHomePage
        tournaments={summaries}
        isAdmin={isAdmin}
        loading={loading}
        syncError={syncError}
        cloudSetupNeeded={cloudSetupNeeded}
        isCloudEnabled={isCloudEnabled}
        onOpen={(id) => {
          setSelectedId(id)
          setView('tournament')
        }}
        onCreate={isAdmin ? () => setView('create') : undefined}
        onEdit={
          isAdmin
            ? (id) => {
                setSelectedId(id)
                setEditReturnTo('home')
                setView('edit')
              }
            : undefined
        }
        onDelete={isAdmin ? remove : undefined}
      />
    </>
  )
}

export default App
