import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PlayerProfilesProvider } from './context/PlayerProfilesContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlayerProfilesProvider>
      <App />
    </PlayerProfilesProvider>
  </StrictMode>,
)
