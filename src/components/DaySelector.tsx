import { DAY_LABELS, DAYS } from '../data/schedule'
import type { Day } from '../types'

interface DaySelectorProps {
  active: Day
  onChange: (day: Day) => void
}

export function DaySelector({ active, onChange }: DaySelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none">
      {DAYS.map((day) => (
        <button
          key={day}
          type="button"
          onClick={() => onChange(day)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
            active === day
              ? 'bg-white text-gray-900 shadow-md'
              : 'bg-transparent text-gray-600 hover:bg-white/50'
          }`}
        >
          {DAY_LABELS[day]}
        </button>
      ))}
    </div>
  )
}
