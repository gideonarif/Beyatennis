import type { Day } from '../types'
import { formatDayLabelForConfig } from '../tournament/scheduleDays'

interface DaySelectorProps {
  active: Day
  days: Day[]
  tournamentId?: string
  onChange: (day: Day) => void
}

function dayButtonClass(active: boolean): string {
  return `shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-all sm:px-4 ${
    active
      ? 'bg-white text-gray-900 shadow-md'
      : 'bg-transparent text-gray-600 hover:bg-white/50'
  }`
}

export function DaySelector({ active, days, tournamentId, onChange }: DaySelectorProps) {
  return (
    <div className="min-w-0 border-b border-gray-200/50 bg-white/95">
      {/* Mobile: horizontal scroll so full date labels stay visible */}
      <div className="overflow-x-auto overscroll-x-contain px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => onChange(day)}
              className={dayButtonClass(active === day)}
            >
              {formatDayLabelForConfig(day, tournamentId)}
            </button>
          ))}
        </div>
      </div>

      {/* md+: wrap within the page width — no horizontal overflow */}
      <div className="hidden flex-wrap gap-2 px-4 py-3 md:flex">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => onChange(day)}
            className={dayButtonClass(active === day)}
          >
            {formatDayLabelForConfig(day, tournamentId)}
          </button>
        ))}
      </div>
    </div>
  )
}
