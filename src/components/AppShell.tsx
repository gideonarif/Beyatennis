import { useSiteAppearance } from '../context/SiteAppearanceContext'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { backgroundStyle } = useSiteAppearance()

  return (
    <div className="min-h-dvh transition-colors duration-300" style={backgroundStyle}>
      {children}
    </div>
  )
}
