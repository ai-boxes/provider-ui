import { Navigate } from 'react-router'

import { homePathForRole } from '@/features/auth/auth-route-policy'
import { useAuthState } from '@/features/auth/use-auth-state'

export function HomeRedirect() {
  const authState = useAuthState()

  if (authState.status !== 'authenticated') {
    return null
  }

  return (
    <Navigate
      to={homePathForRole(authState.user.role)}
      replace
    />
  )
}
