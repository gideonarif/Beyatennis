import type { UserRole } from '../hooks/useRole'

interface RoleToggleProps {
  role: UserRole
  onRequestRole: (role: UserRole) => void
}

export function RoleToggle({ role, onRequestRole }: RoleToggleProps) {
  return (
    <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs">
      <button
        type="button"
        onClick={() => onRequestRole('viewer')}
        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
          role === 'viewer'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Viewer
      </button>
      <button
        type="button"
        onClick={() => onRequestRole('admin')}
        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
          role === 'admin'
            ? 'bg-white text-blue-700 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Admin
      </button>
    </div>
  )
}
