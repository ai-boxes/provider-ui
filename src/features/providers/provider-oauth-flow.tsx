import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  Clock3Icon,
  ExternalLinkIcon,
  Loader2Icon,
  ShieldCheckIcon,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { cancelProviderOAuthSession } from '@/features/providers/provider-api'
import {
  formatOAuthService,
  formatProviderKind,
} from '@/features/providers/provider-format'
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


export function ProviderOAuthFlow({
  sessionId,
  provider,
}: {
  sessionId: string
  provider?: OAuthProviderKind
}) {
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const session = useQuery({
    ...providerOAuthSessionQueryOptions(sessionId),
    refetchInterval: (query) => {
      const current = query.state.data
      return current?.status === 'pending'
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
    navigate(
      `/providers/${encodeURIComponent(session.data.accountId)}`,
      { replace: true },
    )
  }, [navigate, queryClient, session.data])

  const sessionProvider = session.data?.provider ?? provider
  const providerName = sessionProvider
    ? formatProviderKind(sessionProvider)
    : 'Provider'
  const serviceName = sessionProvider
    ? formatOAuthService(sessionProvider)
    : 'upstream'

  function startOver() {
    setSearchParams(
      sessionProvider
        ? { provider: sessionProvider, method: 'oauth' }
        : {},
      { replace: true },
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <div className="grid gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit text-muted-foreground"
          render={<Link to="/providers" />}
        >
          <ArrowLeftIcon />
          Back to providers
        </Button>
        <div className="grid gap-1.5">
          <h2 className="text-xl font-semibold tracking-tight">
            {providerName} authorization
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Complete the {serviceName} device authorization flow to create this
            Provider.
          </p>
        </div>
      </div>

      {session.isPending ? <OAuthSessionLoading /> : null}
      {session.isError ? (
        <OAuthSessionError error={session.error} onStartOver={startOver} />
      ) : null}
      {session.data ? (
        <OAuthSessionCard
          session={session.data}
          cancelling={cancelSession.isPending}
          cancelError={cancelSession.error}
          onCancel={() => cancelSession.mutate()}
          onStartOver={startOver}
        />
      ) : null}
    </section>
  )
}

function OAuthSessionCard({
  session,
  cancelling,
  cancelError,
  onCancel,
  onStartOver,
}: {
  session: ProviderOAuthSession
  cancelling: boolean
  cancelError: unknown
  onCancel: () => void
  onStartOver: () => void
}) {
  if (session.status === 'failed' || session.status === 'cancelled') {
    return (
      <Card>
        <CardHeader>
          <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <CircleAlertIcon className="size-5" />
          </span>
          <CardTitle>
            {session.status === 'failed'
              ? 'Authorization failed'
              : 'Authorization cancelled'}
          </CardTitle>
          <CardDescription>
            No Provider was created. Start a new authorization session to try
            again.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-end">
          <Button onClick={onStartOver}>Start again</Button>
        </CardFooter>
      </Card>
    )
  }

  if (session.status === 'completed') {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <CircleCheckIcon className="size-5 text-emerald-600" />
          <div>
            <p className="font-medium">Authorization completed</p>
            <p className="text-sm text-muted-foreground">
              Opening the Provider details…
            </p>
          </div>
          <Spinner className="ml-auto" />
        </CardContent>
      </Card>
    )
  }

  const authorizationUrl =
    session.challenge.verificationUriComplete ??
    session.challenge.verificationUri

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <ShieldCheckIcon className="size-5" />
          </span>
          <Badge variant="outline" className="gap-1.5 bg-background">
            <Loader2Icon className="animate-spin" />
            Waiting for authorization
          </Badge>
        </div>
        <CardTitle>{session.label}</CardTitle>
        <CardDescription>
          Open the {formatOAuthService(session.provider)} authorization page and
          enter the code below when asked. This page will continue
          automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {cancelError ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Unable to cancel authorization</AlertTitle>
            <AlertDescription>
              The session may still be active. Try again or wait for it to
              finish.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Authorization code
          </span>
          <code className="rounded-xl border bg-muted/45 px-4 py-4 text-center font-mono text-xl font-semibold tracking-[0.2em] text-foreground select-all">
            {session.challenge.userCode}
          </code>
        </div>

        <Button
          size="lg"
          render={
            <a href={authorizationUrl} target="_blank" rel="noreferrer" />
          }
        >
          Open {formatOAuthService(session.provider)} authorization
          <ExternalLinkIcon />
        </Button>

        <div className="flex items-center gap-2 rounded-lg bg-muted/45 px-3 py-2.5 text-sm text-muted-foreground">
          <Clock3Icon className="size-4 shrink-0" />
          <span>
            Code expires {formatTimestamp(session.challenge.expiresAt)}
          </span>
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner className="size-3.5" />
          Checking status
        </span>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={cancelling}
        >
          {cancelling ? <Loader2Icon className="animate-spin" /> : null}
          Cancel
        </Button>
      </CardFooter>
    </Card>
  )
}

function OAuthSessionLoading() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="size-10" />
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-full max-w-md" />
      </CardHeader>
      <CardContent className="grid gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  )
}

function OAuthSessionError({
  error,
  onStartOver,
}: {
  error: unknown
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
      <Button
        size="sm"
        variant="outline"
        className="mt-3 w-fit group-has-[>svg]/alert:col-start-2"
        onClick={onStartOver}
      >
        Start again
      </Button>
    </Alert>
  )
}

function formatTimestamp(timestamp: number): string {
  return formatUnixSeconds(timestamp)
}
