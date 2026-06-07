export type SiteBackgroundMode = 'color' | 'gradient' | 'image'

export interface SiteAppearance {
  mode: SiteBackgroundMode
  color: string
  gradientFrom: string
  gradientTo: string
  gradientAngle: number
  imageUrl: string | null
}

export const DEFAULT_SITE_APPEARANCE: SiteAppearance = {
  mode: 'color',
  color: '#f0f2f5',
  gradientFrom: '#1e3a8a',
  gradientTo: '#312e81',
  gradientAngle: 135,
  imageUrl: null,
}

export function siteAppearanceToStyle(
  appearance: SiteAppearance,
): Record<string, string | number> {
  if (appearance.mode === 'image' && appearance.imageUrl) {
    return {
      backgroundColor: appearance.color,
      backgroundImage: `url("${appearance.imageUrl}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    }
  }

  if (appearance.mode === 'gradient') {
    return {
      background: `linear-gradient(${appearance.gradientAngle}deg, ${appearance.gradientFrom}, ${appearance.gradientTo})`,
      backgroundAttachment: 'fixed',
    }
  }

  return { backgroundColor: appearance.color }
}
