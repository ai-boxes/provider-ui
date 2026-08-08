import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from 'react-router'

import { AuthPageLayout } from '@/components/layout/auth-page-layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import {
  authReturnState,
  readAuthReturnTo,
} from '@/features/auth/auth-navigation'
import {
  clearAuthSession,
  restoreAuthSession,
} from '@/features/auth/auth-session'
import { setupStatusQueryOptions } from '@/features/auth/setup-status-query'
import { useAuthState } from '@/features/auth/use-auth-state'

export function AuthRouteBoundary() {
  const authState = useAuthState()
  const location = useLocation()
  const setupStatus = useQuery({
    ...setupStatusQueryOptions,
    enabled: authState.status === 'anonymous',
  })

  if (authState.status === 'loading' || authState.status === 'restoring') {
    return (
      <AuthStatusCard
        title="Restoring session"
        description="Checking your saved session."
        busy
      />
    )
  }

  if (authState.status === 'recovery_error') {
    return (
      <AuthStatusCard
        title="Unable to restore session"
        description="Check your connection and try again, or return to sign in."
        actions={
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={() => void restoreAuthSession()}>
              Retry
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={clearAuthSession}
            >
              Sign in again
            </Button>
          </div>
        }
      />
    )
  }

  if (authState.status === 'authenticated') {
    return isAuthenticationRoute(location.pathname) ? (
      <Navigate to={readAuthReturnTo(location.state)} replace />
    ) : (
      <Outlet />
    )
  }

  if (setupStatus.isPending) {
    return (
      <AuthStatusCard
        title="Checking setup"
        description="Determining how to continue."
        busy
      />
    )
  }

  if (setupStatus.isError || !setupStatus.data) {
    return (
      <AuthStatusCard
        title="Unable to check setup"
        description="The server could not be reached. Check your connection and try again."
        actions={
          <Button className="w-full" onClick={() => void setupStatus.refetch()}>
            Retry
          </Button>
        }
      />
    )
  }

  if (setupStatus.data.required) {
    return location.pathname === '/setup' ? (
      <Outlet />
    ) : (
      <Navigate to="/setup" replace />
    )
  }

  return location.pathname === '/login' ? (
    <Outlet />
  ) : (
    <Navigate
      to="/login"
      replace
      state={authReturnState(location)}
    />
  )
}

type AuthStatusCardProps = {
  title: string
  description: string
  busy?: boolean
  actions?: React.ReactNode
}

function AuthStatusCard({
  title,
  description,
  busy = false,
  actions,
}: AuthStatusCardProps) {
  return (
    <AuthPageLayout>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>{title}</h1>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {busy || actions ? (
          <CardContent>
            {busy ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                Please wait
              </div>
            ) : (
              actions
            )}
          </CardContent>
        ) : null}
      </Card>
    </AuthPageLayout>
  )
}

function isAuthenticationRoute(pathname: string): boolean {
  return pathname === '/login' || pathname === '/setup'
}
