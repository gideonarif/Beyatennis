import { useCallback, useState } from 'react'

export type UserRole = 'admin' | 'viewer'

const ADMIN_SESSION_KEY = 'ttt-admin-session'
const LEGACY_ROLE_KEY = 'ttt-role'

const ADMIN_PASSWORD = 'Faith1234'

function isAdminSessionActive(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function clearLegacyRoleStorage() {
  try {
    localStorage.removeItem(LEGACY_ROLE_KEY)
  } catch {
    /* ignore */
  }
}

clearLegacyRoleStorage()

export function useRole() {
  const [role, setRole] = useState<UserRole>(
    () => (isAdminSessionActive() ? 'admin' : 'viewer'),
  )
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const unlockAdmin = useCallback((password: string): boolean => {
    if (password !== ADMIN_PASSWORD) {
      setPasswordError('Incorrect password')
      return false
    }
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, '1')
    } catch {
      /* ignore */
    }
    setRole('admin')
    setPasswordError(null)
    setShowPasswordModal(false)
    return true
  }, [])

  const switchToViewer = useCallback(() => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY)
    } catch {
      /* ignore */
    }
    setRole('viewer')
    setShowPasswordModal(false)
    setPasswordError(null)
  }, [])

  const requestRole = useCallback((next: UserRole) => {
    if (next === 'viewer') {
      switchToViewer()
      return
    }
    if (role === 'admin') return
    setPasswordError(null)
    setShowPasswordModal(true)
  }, [role, switchToViewer])

  const cancelPasswordModal = useCallback(() => {
    setShowPasswordModal(false)
    setPasswordError(null)
  }, [])

  return {
    role,
    isAdmin: role === 'admin',
    showPasswordModal,
    passwordError,
    requestRole,
    unlockAdmin,
    cancelPasswordModal,
  }
}
