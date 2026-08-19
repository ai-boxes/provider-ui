import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  CircleCheckIcon,
  Clock3Icon,
  ExternalLinkIcon,
  Loader2Icon,
} from 'lucide-react'
import { useNavigate } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { cancelProviderOAuthSession } from '@/features/providers/provider-api'
import { formatOAuthService } from '@/features/providers/provider-format'
import {
  ProviderCreateBody,
  ProviderCreateFooter,
} from '@/features/providers/provider-create-shared'
import {
  providerKeys,
  providerOAuthSessionQueryOptions,
} from '@/features/providers/providers-query'
import type {
  OAuthProviderKind,
  ProviderOAuthSession,
} from '@/features/providers/provider-types'
import { ApiError } from '@/lib/api/error'
import { formatUnixSeconds } from '@/lib/datetime'
import { statusTextTone } from '@/lib/status-tone'
import { cn } from '@/lib/utils'

export function ProviderOAuthFlow({
  sessionId,
  provider,
  mode = 'create',
  restartPending = false,
  onRestart,
}: {
  sessionId: string
  provider?: OAuthProviderKind
  mode?: 'create' | 'reauth'
  restartPending?: boolean
  onRestart: (provider?: OAuthProviderKind) => void
}) {
  const navigate = useNavigate()
  const [startOverError, setStartOverError] = useState<unknown>(null)
  const [startingOver, setStartingOver] = useState(false)
  const queryClient = useQueryClient()
  const session = useQuery({
    ...providerOAuthSessionQueryOptions(sessionId),
    refetchInterval: (query) => {
      const current = query.state.data
      return current?.status === 'pending' || current?.status === 'provisioning'
        ? Math.max(current.challenge.intervalSeconds * 1000, 1000)
        : false
    },
  })
  const cancelSession = useMutation({
    mutationFn: () => cancelProviderOAuthSession(sessionId),
    onSuccess: (cancelled) => {
      queryClient.setQueryData(providerKeys.oauthSession(sessionId), cancelled)
    },
  })

  useEffect(() => {
    if (session.data?.status !== 'completed') {
      return
    }

    void queryClient.invalidateQueries({
      queryKey: providerKeys.all,
      exact: true,
    })
    void queryClient.invalidateQueries({
      queryKey: providerKeys.detail(session.data.accountId),
    })
    void queryClient.invalidateQueries({
      queryKey: providerKeys.models(session.data.accountId),
    })
    void queryClient.invalidateQueries({
      queryKey: providerKeys.quota(session.data.accountId),
    })
    navigate(
      `/providers/${encodeURIComponent(session.data.accountId)}`,
      { replace: true },
    )
  }, [navigate, queryClient, session.data])

  const sessionProvider = session.data?.provider ?? provider
  const restarting = startingOver || restartPending

  async function startOver() {
    setStartOverError(null)

    if (!session.data || session.data.status === 'pending') {
      setStartingOver(true)
      try {
        const cancelled = await cancelProviderOAuthSession(sessionId)
        queryClient.setQueryData(
          providerKeys.oauthSession(sessionId),
          cancelled,
        )
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) {
          setStartOverError(error)
          return
        }
      } finally {
        setStartingOver(false)
      }
    }

    onRestart(sessionProvider)
  }

  return (
    <>
      <ProviderCreateBody>
        {session.isPending ? <OAuthSessionLoading /> : null}
        {session.isError ? (
          <OAuthSessionError
            error={session.error}
            startOverError={startOverError}
            startingOver={restarting}
            onRetry={() => void session.refetch()}
            onStartOver={() => void startOver()}
          />
        ) : null}
        {session.data ? (
          <OAuthSessionStatus
            session={session.data}
            cancelError={cancelSession.error}
            mode={mode}
          />
        ) : null}
      </ProviderCreateBody>

      {session.data ? (
        <OAuthSessionActions
          session={session.data}
          cancelling={cancelSession.isPending}
          restarting={restarting}
          onCancel={() => cancelSession.mutate()}
          onStartOver={() => void startOver()}
        />
      ) : null}
    </>
  )
}

function OAuthSessionStatus({
  session,
  cancelError,
  mode,
}: {
  session: ProviderOAuthSession
  cancelError: unknown
  mode: 'create' | 'reauth'
}) {
  const reauthenticating = mode === 'reauth'

  if (session.status === 'failed' || session.status === 'cancelled') {
    return (
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <CircleAlertIcon className="size-4" />
        </span>
        <div className="grid gap-1">
          <p className="font-medium">
            {session.status === 'failed'
              ? 'Authorization failed'
              : 'Authorization cancelled'}
          </p>
          <p className="text-muted-foreground">
            {reauthenticating
              ? 'The existing credential was not changed.'
              : 'No provider was created.'}
          </p>
        </div>
      </div>
    )
  }

  if (session.status === 'completed') {
    return (
      <div className="flex items-center gap-3">
        <CircleCheckIcon
          className={cn('size-5 shrink-0', statusTextTone('success'))}
        />
        <div className="grid gap-1">
          <p className="font-medium">Authorization completed</p>
          <p className="text-muted-foreground">Opening provider…</p>
        </div>
        <Spinner className="ml-auto" />
      </div>
    )
  }

  if (session.status === 'provisioning') {
    return (
      <div className="flex items-center gap-3">
        <Spinner className="size-5 shrink-0" />
        <div className="grid gap-1">
          <p className="font-medium">
            {reauthenticating ? 'Updating Provider credential' : 'Creating Provider'}
          </p>
          <p className="text-muted-foreground">
            {reauthenticating ? 'Applying the new credential.' : 'Finishing setup.'}
          </p>
        </div>
      </div>
    )
  }

  const authorizationUrl =
    session.challenge.verificationUriComplete ??
    session.challenge.verificationUri

  return (
    <>
      {cancelError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Unable to cancel authorization</AlertTitle>
          <AlertDescription>
            Try again or wait for it to finish.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Open {formatOAuthService(session.provider)} and enter this code
        </span>
        <code className="rounded-lg border bg-muted/50 px-4 py-4 text-center font-mono text-xl font-semibold tracking-[0.2em] text-foreground select-all">
          {session.challenge.userCode}
        </code>
      </div>

      <Button
        size="lg"
        render={<a href={authorizationUrl} target="_blank" rel="noreferrer" />}
      >
        Open {formatOAuthService(session.provider)} authorization
        <ExternalLinkIcon />
      </Button>

      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-muted-foreground">
        <Clock3Icon className="size-4 shrink-0" />
        <span>Code expires {formatTimestamp(session.challenge.expiresAt)}</span>
      </div>
    </>
  )
}

// Provisioning and completed resolve on their own, so neither offers an
// action: the dialog is only waiting for the next poll to move it along.
function OAuthSessionActions({
  session,
  cancelling,
  restarting,
  onCancel,
  onStartOver,
}: {
  session: ProviderOAuthSession
  cancelling: boolean
  restarting: boolean
  onCancel: () => void
  onStartOver: () => void
}) {
  if (session.status === 'failed' || session.status === 'cancelled') {
    return (
      <ProviderCreateFooter>
        <Button onClick={onStartOver} disabled={restarting}>
          {restarting ? <Loader2Icon className="animate-spin" /> : null}
          {restarting ? 'Starting again…' : 'Start again'}
        </Button>
      </ProviderCreateFooter>
    )
  }

  if (session.status !== 'pending') {
    return null
  }

  return (
    <ProviderCreateFooter className="sm:justify-between">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner className="size-3.5" />
        Checking status
      </span>
      <Button variant="outline" onClick={onCancel} disabled={cancelling}>
        {cancelling ? <Loader2Icon className="animate-spin" /> : null}
        Cancel
      </Button>
    </ProviderCreateFooter>
  )
}

function OAuthSessionLoading() {
  return (
    <>
      <Skeleton className="h-4 w-44" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-10 w-full" />
    </>
  )
}

function OAuthSessionError({
  error,
  startOverError,
  startingOver,
  onRetry,
  onStartOver,
}: {
  error: unknown
  startOverError: unknown
  startingOver: boolean
  onRetry: () => void
  onStartOver: () => void
}) {
  const unavailable = error instanceof ApiError && error.status === 404

  return (
    <Alert>
      <CircleAlertIcon />
      <AlertTitle>
        {unavailable
          ? 'Authorization session is no longer available'
          : 'Unable to check authorization'}
      </AlertTitle>
      <AlertDescription>
        {unavailable
          ? 'The server may have restarted or the session may have expired.'
          : 'Check the server connection and try again.'}
      </AlertDescription>
      {startOverError ? (
        <p className="mt-2 text-sm text-destructive group-has-[>svg]/alert:col-start-2">
          The current session could not be cancelled. Retry this session or try
          starting over again.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 group-has-[>svg]/alert:col-start-2">
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry current session
        </Button>
        <Button size="sm" onClick={onStartOver} disabled={startingOver}>
          {startingOver ? <Loader2Icon className="animate-spin" /> : null}
          Start again
        </Button>
      </div>
    </Alert>
  )
}

function formatTimestamp(timestamp: number): string {
  return formatUnixSeconds(timestamp)
}
