import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppShell } from './components/AppShell'
import { PlayerProfilesProvider } from './context/PlayerProfilesContext'
import { SiteAppearanceProvider } from './context/SiteAppearanceContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlayerProfilesProvider>
      <SiteAppearanceProvider>
        <AppShell>
          <App />
        </AppShell>
      </SiteAppearanceProvider>
    </PlayerProfilesProvider>
  </StrictMode>,
)
