import type { Tab } from '../types'

interface BottomNavProps {
  active: Tab
  visibleTabs: Tab[]
  onChange: (tab: Tab) => void
}

const ALL_TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'schedule', label: 'Schedule', icon: '📅' },
  { id: 'standings', label: 'Standings', icon: '📊' },
  { id: 'bracket', label: 'Bracket', icon: '🏆' },
  { id: 'players', label: 'Players', icon: '👥' },
]

export function BottomNav({ active, visibleTabs, onChange }: BottomNavProps) {
  const tabs = ALL_TABS.filter((t) => visibleTabs.includes(t.id))

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex w-full max-w-lg md:max-w-3xl lg:max-w-5xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              active === tab.id
                ? 'font-semibold text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
