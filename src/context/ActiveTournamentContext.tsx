import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { TournamentConfig } from '../types/tournament'
import { createRuntime, type TournamentRuntime } from '../tournament/runtime'

const ActiveTournamentContext = createContext<TournamentRuntime | null>(null)

export function ActiveTournamentProvider({
  config,
  children,
}: {
  config: TournamentConfig
  children: ReactNode
}) {
  const runtime = useMemo(
    () => createRuntime(config),
    [config, config.updatedAt, config.scheduleDays, config.groupMatches],
  )

  return (
    <ActiveTournamentContext.Provider value={runtime}>
      {children}
    </ActiveTournamentContext.Provider>
  )
}

export function useTournamentRuntime(): TournamentRuntime {
  const ctx = useContext(ActiveTournamentContext)
  if (!ctx) {
    throw new Error('useTournamentRuntime must be used within ActiveTournamentProvider')
  }
  return ctx
}

export function usePlayerName(): (id: string) => string {
  const ctx = useTournamentRuntime()
  return ctx.getPlayerName
}
