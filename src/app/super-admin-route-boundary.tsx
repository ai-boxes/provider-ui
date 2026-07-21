import { Navigate, Outlet } from 'react-router'

import { useAuthState } from '@/features/auth/use-auth-state'

export function SuperAdminRouteBoundary() {
  const authState = useAuthState()

  if (authState.status !== 'authenticated') {
    return null
  }

  return authState.session.user.role === 'super_admin' ? (
    <Outlet />
  ) : (
    <Navigate to="/providers" replace />
  )
}
