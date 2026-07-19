import { useEffect, type PropsWithChildren } from 'react'

import { startAuthSession } from '@/features/auth/auth-session'

export function AuthProvider({ children }: PropsWithChildren) {
  useEffect(() => startAuthSession(), [])

  return children
}
