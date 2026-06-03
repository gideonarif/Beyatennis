import type { Player } from '../types'

export const GROUP_A_ORDER = ['naty', 'bereket', 'wogderes', 'dere', 'tade'] as const
export const GROUP_B_ORDER = ['gedion', 'yetagesu', 'melaku', 'nafkot', 'beya'] as const

export const PLAYERS: Player[] = [
  { id: 'naty', name: 'Naty', group: 'A' },
  { id: 'bereket', name: 'Bereket', group: 'A' },
  { id: 'wogderes', name: 'Wogderes', group: 'A' },
  { id: 'dere', name: 'Dere', group: 'A' },
  { id: 'tade', name: 'Tade', group: 'A' },
  { id: 'gedion', name: 'Gedion', group: 'B' },
  { id: 'yetagesu', name: 'Yetagesu', group: 'B' },
  { id: 'melaku', name: 'Melaku', group: 'B' },
  { id: 'nafkot', name: 'Nafkot', group: 'B' },
  { id: 'beya', name: 'Beya', group: 'B' },
]

export const GROUP_PLAYER_ORDER: Record<'A' | 'B', readonly string[]> = {
  A: GROUP_A_ORDER,
  B: GROUP_B_ORDER,
}

export const playerMap = Object.fromEntries(PLAYERS.map((p) => [p.id, p])) as Record<
  string,
  Player
>

export function playerName(id: string): string {
  return playerMap[id]?.name ?? id
}
