import { useMutation } from '@tanstack/react-query'
import { KeyRoundIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  type DialogChangeEventDetails,
} from '@/components/ui/dialog'
import { startProviderReauth } from '@/features/providers/provider-api'
import {
  formatOAuthService,
  formatProviderKind,
  isOAuthProvider,
} from '@/features/providers/provider-format'
import { ProviderOAuthFlow } from '@/features/providers/provider-oauth-flow'
import type { ProviderAccount } from '@/features/providers/provider-types'
import { ApiError } from '@/lib/api/error'

const reauthDialogClasses =
  'flex max-h-[calc(100svh-2rem)] flex-col gap-5 p-6 sm:max-w-xl [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:right-4'
const reauthSessionParam = 'reauth_session'
const reauthAccountParam = 'reauth_account'

export function ProviderReauthDialog({ account }: { account: ProviderAccount }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const provider = isOAuthProvider(account.provider) ? account.provider : null
  const sessionId =
    searchParams.get(reauthAccountParam) === account.id
      ? searchParams.get(reauthSessionParam)
      : null
  const [open, setOpen] = useState(() => sessionId !== null)
  const reauthStartInFlight = useRef(false)
  const startReauth = useMutation({
    mutationFn: () => startProviderReauth(account.id),
    onSuccess: (session) => {
      const next = new URLSearchParams(searchParams)
      next.set(reauthAccountParam, account.id)
      next.set(reauthSessionParam, session.id)
      setSearchParams(next, { replace: true })
    },
    onSettled: () => {
      reauthStartInFlight.current = false
    },
  })

  useEffect(() => {
    setOpen(sessionId !== null)
  }, [account.id, sessionId])

  if (!provider) {
    return null
  }

  function openReauth() {
    if (sessionId) {
      setOpen(true)
      return
    }

    startReauthSession()
  }

  function startReauthSession() {
    if (startReauth.isPending || reauthStartInFlight.current) {
      return
    }

    reauthStartInFlight.current = true
    startReauth.mutate()
  }

  function handleOpenChange(
    nextOpen: boolean,
    details: DialogChangeEventDetails,
  ) {
    if (nextOpen) {
      setOpen(true)
      return
    }

    // Escape is an accidental dismissal while the server-side OAuth session
    // is still the only way back to the flow. The explicit close button can
    // still dismiss it; the in-dialog Cancel action remains available for
    // ending a pending session upstream.
    if (sessionId && details.reason === 'escape-key') {
      return
    }

    const next = new URLSearchParams(searchParams)
    next.delete(reauthAccountParam)
    next.delete(reauthSessionParam)
    setSearchParams(next, { replace: true })
    setOpen(false)
  }

  return (
    <>
      <div className="grid gap-2">
        <p>
          This Provider credential is no longer valid. Reauthenticate with{' '}
          {formatOAuthService(provider)} to restore routing for this account.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="w-fit"
          disabled={startReauth.isPending}
          onClick={openReauth}
        >
          {startReauth.isPending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <KeyRoundIcon />
          )}
          {startReauth.isPending ? 'Starting authorization…' : 'Reauthenticate'}
        </Button>
        {startReauth.isError ? (
          <span className="text-sm text-destructive" role="alert">
            {startReauthErrorMessage(startReauth.error)}
          </span>
        ) : null}
      </div>

      <Dialog
        open={open}
        onOpenChange={handleOpenChange}
        disablePointerDismissal
      >
        <DialogContent className={reauthDialogClasses}>
          <DialogHeader>
            <DialogTitle>
              Reauthenticate {formatProviderKind(provider)}
            </DialogTitle>
            <DialogDescription>
              Complete the {formatOAuthService(provider)} device authorization
              to replace the expired credential on this account.
            </DialogDescription>
          </DialogHeader>
          {sessionId ? (
            <ProviderOAuthFlow
              sessionId={sessionId}
              provider={provider}
              mode="reauth"
              restartPending={startReauth.isPending}
              onRestart={startReauthSession}
            />
          ) : null}
          {startReauth.isError ? (
            <Alert variant="destructive">
              <KeyRoundIcon />
              <AlertTitle>Unable to start reauthentication</AlertTitle>
              <AlertDescription>
                {startReauthErrorMessage(startReauth.error)}
              </AlertDescription>
            </Alert>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function startReauthErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'The authorization could not be started. Try again.'
}
