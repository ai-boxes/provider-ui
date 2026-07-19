import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useRef, type PropsWithChildren } from 'react'

import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth/auth-provider'
import type { AuthState } from '@/features/auth/auth-types'
import { useAuthState } from '@/features/auth/use-auth-state'

const queryClient = new QueryClient()

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <QueryCacheSessionBoundary>
          <TooltipProvider>{children}</TooltipProvider>
        </QueryCacheSessionBoundary>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function QueryCacheSessionBoundary({ children }: PropsWithChildren) {
  const authState = useAuthState()
  const userId = authUserId(authState)
  const previousUserId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (
      previousUserId.current !== undefined &&
      previousUserId.current !== userId
    ) {
      queryClient.clear()
    }

    previousUserId.current = userId
  }, [userId])

  return children
}

function authUserId(state: AuthState): string | null {
  return 'session' in state ? state.session.user.id : null
}
