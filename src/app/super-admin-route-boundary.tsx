import { Navigate, Outlet } from 'react-router'

import { canAccessSuperAdminRoutes } from '@/features/auth/auth-route-policy'
import { useAuthState } from '@/features/auth/use-auth-state'

export function SuperAdminRouteBoundary() {
  const authState = useAuthState()

  if (authState.status !== 'authenticated') {
    return null
  }

  return canAccessSuperAdminRoutes(authState.user.role) ? (
    <Outlet />
  ) : (
    <Navigate to="/api-keys" replace />
  )
}
