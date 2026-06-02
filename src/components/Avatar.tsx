import { usePlayerProfiles } from '../context/PlayerProfilesContext'

interface AvatarProps {
  name: string
  playerId?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

export function Avatar({ name, playerId, size = 'md' }: AvatarProps) {
  const { getAvatarUrl } = usePlayerProfiles()
  const photoUrl = playerId ? getAvatarUrl(playerId) : null
  const initial = name.charAt(0).toUpperCase()
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeClasses[size]} shrink-0 rounded-full object-cover ring-2 ring-white`}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      style={{ backgroundColor: `hsl(${hue}, 45%, 55%)` }}
      aria-hidden
    >
      {initial}
    </div>
  )
}
