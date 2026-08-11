import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useRef, type PropsWithChildren } from 'react'

import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth/auth-provider'
import { setupStatusQueryKey } from '@/features/auth/setup-status-query'
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
      queryClient.removeQueries({
        predicate: (query) => !isSetupStatusQuery(query.queryKey),
      })
    }

    previousUserId.current = userId
  }, [userId])

  return children
}

function isSetupStatusQuery(queryKey: readonly unknown[]): boolean {
  return (
    queryKey.length === setupStatusQueryKey.length &&
    queryKey.every((part, index) => part === setupStatusQueryKey[index])
  )
}

function authUserId(state: AuthState): string | null {
  return state.status === 'authenticated' ? state.user.id : null
}
