import { playerName } from '../data/players'

interface ChampionBannerProps {
  first: string
  second: string
  third: string
}

export function ChampionBanner({ first, second, third }: ChampionBannerProps) {
  return (
    <div className="mx-4 mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-6 text-center shadow-lg">
      <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-amber-900/80">
        Tournament Complete
      </p>
      <h2 className="mb-4 text-2xl font-bold text-white drop-shadow">🏆 Champion</h2>
      <p className="mb-6 text-3xl font-bold text-white">{playerName(first)}</p>
      <div className="flex justify-center gap-6 text-white">
        <div className="rounded-xl bg-white/20 px-4 py-3 backdrop-blur">
          <p className="text-2xl">🥇</p>
          <p className="font-bold">{playerName(first)}</p>
          <p className="text-xs opacity-80">1st</p>
        </div>
        <div className="rounded-xl bg-white/20 px-4 py-3 backdrop-blur">
          <p className="text-2xl">🥈</p>
          <p className="font-bold">{playerName(second)}</p>
          <p className="text-xs opacity-80">2nd</p>
        </div>
        <div className="rounded-xl bg-white/20 px-4 py-3 backdrop-blur">
          <p className="text-2xl">🥉</p>
          <p className="font-bold">{playerName(third)}</p>
          <p className="text-xs opacity-80">3rd</p>
        </div>
      </div>
    </div>
  )
}
