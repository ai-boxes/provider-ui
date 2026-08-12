import { useMutation } from '@tanstack/react-query'
import {
  CheckIcon,
  CircleAlertIcon,
  CopyIcon,
  KeyRoundIcon,
  Loader2Icon,
} from 'lucide-react'
import { useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { createRegistrationCode } from '@/features/users/user-api'
import { apiErrorMessage } from '@/lib/api/error'

export function RegistrationCodeCreateDialog() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const code = useMutation({ mutationFn: createRegistrationCode })

  function handleOpenChange(nextOpen: boolean) {
    if (code.isPending) {
      return
    }

    setOpen(nextOpen)
    code.reset()
    setCopied(false)
    setCopyFailed(false)
  }

  async function copyCode() {
    if (!code.data) {
      return
    }

    try {
      await navigator.clipboard.writeText(code.data.code)
      setCopied(true)
      setCopyFailed(false)
    } catch {
      setCopyFailed(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <KeyRoundIcon />
        Generate code
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate invitation code</DialogTitle>
          <DialogDescription>One-time registration code.</DialogDescription>
        </DialogHeader>

        {code.isError ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Unable to generate code</AlertTitle>
            <AlertDescription>
              {apiErrorMessage(
                code.error,
                'The invitation code could not be generated. Try again.',
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        {code.data ? (
          <Field>
            <FieldLabel htmlFor="registration-code">Invitation code</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="registration-code"
                value={code.data.code}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Copy invitation code"
                title="Copy invitation code"
                onClick={() => void copyCode()}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </Button>
            </div>
            <FieldDescription>
              Expires {formatExpiry(code.data.expiresAt)} and can be used once.
            </FieldDescription>
            {copyFailed ? (
              <p className="text-sm text-destructive">
                Clipboard access is unavailable. Select the code and copy it
                manually.
              </p>
            ) : null}
          </Field>
        ) : (
          <p className="text-sm text-muted-foreground">
            Expires in 7 days. Shown once.
          </p>
        )}

        <DialogFooter>
          <DialogClose
            disabled={code.isPending}
            render={<Button variant="outline" disabled={code.isPending} />}
          >
            {code.data ? 'Done' : 'Cancel'}
          </DialogClose>
          {!code.data ? (
            <Button
              type="button"
              disabled={code.isPending}
              onClick={() => code.mutate()}
            >
              {code.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <KeyRoundIcon />
              )}
              Generate code
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatExpiry(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp * 1000))
}
