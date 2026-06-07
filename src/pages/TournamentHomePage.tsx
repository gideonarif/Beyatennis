import { useMemo, useState } from 'react'
import { SiteAppearanceModal } from '../components/SiteAppearanceModal'
import { useSiteAppearance } from '../context/SiteAppearanceContext'
import type { TournamentSummary, TournamentStatus } from '../types/tournament'
import { FORMAT_LABELS } from '../types/tournament'

type FilterStatus = 'all' | TournamentStatus

interface TournamentHomePageProps {
  tournaments: TournamentSummary[]
  isAdmin: boolean
  loading?: boolean
  syncError?: string | null
  cloudSetupNeeded?: boolean
  isCloudEnabled?: boolean
  onOpen: (id: string) => void
  onCreate?: () => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

const STATUS_STYLES: Record<TournamentStatus, string> = {
  upcoming: 'bg-sky-100 text-sky-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-200 text-gray-700',
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function TournamentThumbnail({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-36 w-full object-cover"
      />
    )
  }

  return (
    <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-5xl">
      🏓
      <span className="sr-only">{name}</span>
    </div>
  )
}

export function TournamentHomePage({
  tournaments,
  isAdmin,
  loading = false,
  syncError = null,
  cloudSetupNeeded = false,
  isCloudEnabled = false,
  onOpen,
  onCreate,
  onEdit,
  onDelete,
}: TournamentHomePageProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [showAppearance, setShowAppearance] = useState(false)
  const { cloudWarning: appearanceCloudWarning } = useSiteAppearance()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tournaments.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false
      if (!q) return true
      return (
        t.name.toLowerCase().includes(q) ||
        t.sportType.toLowerCase().includes(q) ||
        FORMAT_LABELS[t.format].toLowerCase().includes(q)
      )
    })
  }, [tournaments, search, filter])

  const filters: { id: FilterStatus; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
  ]

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-8">
      {showAppearance && <SiteAppearanceModal onClose={() => setShowAppearance(false)} />}

      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tournaments</h1>
            {isCloudEnabled && (
              <p className="text-xs text-gray-500">
                {loading ? 'Syncing with cloud…' : 'Cloud sync enabled'}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAppearance(true)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                title="Customize site background"
              >
                Appearance
              </button>
            )}
            {isAdmin && onCreate && (
              <button
                type="button"
                onClick={onCreate}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Create Tournament
              </button>
            )}
          </div>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tournaments…"
          className="mb-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white"
        />

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filter === f.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {syncError && (
        <div
          className={`mx-4 mt-3 rounded-lg px-3 py-2 text-center text-xs ${
            cloudSetupNeeded
              ? 'bg-amber-50 text-amber-900'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {syncError}
        </div>
      )}

      {isAdmin && appearanceCloudWarning && (
        <div className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
          {appearanceCloudWarning}
        </div>
      )}

      <main className="px-4 py-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-12 text-center shadow-sm">
            <p className="text-gray-500">No tournaments match your search.</p>
            {isAdmin && onCreate && (
              <button
                type="button"
                onClick={onCreate}
                className="mt-4 text-sm font-semibold text-blue-600 hover:underline"
              >
                Create your first tournament
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-4">
            {filtered.map((t) => (
              <li key={t.id}>
                <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => onOpen(t.id)}
                    className="block w-full text-left"
                  >
                    <TournamentThumbnail name={t.name} imageUrl={t.imageUrl} />
                    <div className="p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h2 className="text-base font-bold text-gray-900">{t.name}</h2>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[t.status]}`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <dl className="space-y-1 text-sm text-gray-600">
                        <div className="flex justify-between gap-2">
                          <dt className="text-gray-500">Format</dt>
                          <dd className="font-medium text-gray-800">
                            {FORMAT_LABELS[t.format]}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-gray-500">Players</dt>
                          <dd className="font-medium">{t.playerCount}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-gray-500">Start</dt>
                          <dd>{formatDate(t.startDate)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-gray-500">End</dt>
                          <dd>{formatDate(t.endDate)}</dd>
                        </div>
                      </dl>
                    </div>
                  </button>

                  {isAdmin && (onEdit || onDelete) && (
                    <div className="flex gap-2 border-t border-gray-100 px-4 py-3">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(t.id)}
                          className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete "${t.name}"? This cannot be undone.`)) {
                              onDelete(t.id)
                            }
                          }}
                          className="flex-1 rounded-lg border border-red-200 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
