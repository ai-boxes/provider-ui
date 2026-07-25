import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClockIcon,
  CircleAlertIcon,
  EyeIcon,
  Loader2Icon,
  Trash2Icon,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import {
  deleteApiKey,
  getApiKey,
  updateApiKey,
} from '@/features/api-keys/api-key-api'
import { ApiKeyExpirationField } from '@/features/api-keys/api-key-expiration-field'
import {
  dateTimeLocalToTimestamp,
  toDateTimeLocalValue,
} from '@/features/api-keys/api-key-format'
import { ApiKeySecret } from '@/features/api-keys/api-key-secret'
import { apiKeyKeys } from '@/features/api-keys/api-keys-query'
import type {
  ApiKeyDetail,
  ApiKeySummary,
} from '@/features/api-keys/api-key-types'
import { apiErrorMessage } from '@/lib/api/error'
import { replaceListItem } from '@/lib/api/query-cache'

export function ApiKeyEnabledControl({
  apiKey,
  now,
}: {
  apiKey: ApiKeySummary
  now: number
}) {
  const queryClient = useQueryClient()
  const expired = apiKey.expiresAt !== null && apiKey.expiresAt <= now
  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      updateApiKey({ keyId: apiKey.id, enabled }),
    onSuccess: (updated) => replaceListItem(queryClient, apiKeyKeys.all, updated),
  })

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <Switch
          size="sm"
          checked={apiKey.enabled}
          disabled={mutation.isPending}
          aria-label={apiKey.enabled ? 'Disable API key' : 'Enable API key'}
          onCheckedChange={(enabled) => mutation.mutate(enabled)}
        />
        <span className="text-sm">{apiKey.enabled ? 'Enabled' : 'Disabled'}</span>
        {mutation.isPending ? (
          <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {mutation.isError ? (
        <span role="alert" className="text-xs text-destructive">
          Unable to update key status.
        </span>
      ) : expired && apiKey.enabled ? (
        <span className="text-xs text-muted-foreground">
          Update the expiration before this key can authenticate again.
        </span>
      ) : null}
    </div>
  )
}

export function ApiKeyActions({ apiKey }: { apiKey: ApiKeySummary }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ApiKeyRevealDialog apiKey={apiKey} />
      <ApiKeyExpirationDialog apiKey={apiKey} />
      <ApiKeyDeleteDialog apiKey={apiKey} />
    </div>
  )
}

function ApiKeyRevealDialog({ apiKey }: { apiKey: ApiKeySummary }) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<ApiKeyDetail | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const requestVersion = useRef(0)

  function loadDetail() {
    const version = ++requestVersion.current
    setLoading(true)
    setError(null)
    setDetail(null)

    void getApiKey(apiKey.id)
      .then((nextDetail) => {
        if (requestVersion.current === version) {
          setDetail(nextDetail)
        }
      })
      .catch((nextError: unknown) => {
        if (requestVersion.current === version) {
          setError(nextError)
        }
      })
      .finally(() => {
        if (requestVersion.current === version) {
          setLoading(false)
        }
      })
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      loadDetail()
    } else {
      requestVersion.current += 1
      setDetail(null)
      setError(null)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <EyeIcon />
        View key
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{apiKey.label}</DialogTitle>
          <DialogDescription>
            Use this credential with a supported client. Keep it private.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
            <Loader2Icon className="mr-2 size-4 animate-spin" />
            Loading key…
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Unable to load API key</AlertTitle>
            <AlertDescription>{errorMessage(error)}</AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-fit group-has-[>svg]/alert:col-start-2"
              onClick={loadDetail}
            >
              Retry
            </Button>
          </Alert>
        ) : null}

        {detail ? <ApiKeySecret value={detail.key} /> : null}

        <DialogFooter>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const expirationSchema = z
  .object({
    expiresAt: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.expiresAt) {
      return
    }

    const timestamp = dateTimeLocalToTimestamp(values.expiresAt)
    if (timestamp === null || timestamp <= Date.now() / 1000) {
      context.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'Choose a future date and time or clear the expiration.',
      })
    }
  })

type ExpirationValues = z.infer<typeof expirationSchema>

function ApiKeyExpirationDialog({ apiKey }: { apiKey: ApiKeySummary }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<ExpirationValues>({
    resolver: zodResolver(expirationSchema),
    defaultValues: expirationDefaultValues(apiKey),
  })
  const mutation = useMutation({
    mutationFn: (expiresAt: number | null) =>
      updateApiKey({ keyId: apiKey.id, expiresAt }),
    onSuccess: (updated) => {
      replaceListItem(queryClient, apiKeyKeys.all, updated)
      setOpen(false)
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (mutation.isPending) {
      return
    }

    setOpen(nextOpen)
    if (nextOpen) {
      form.reset(expirationDefaultValues(apiKey))
      mutation.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <CalendarClockIcon />
        Expiration
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit expiration</DialogTitle>
          <DialogDescription>
            Change when {apiKey.label} stops authenticating API requests.
          </DialogDescription>
        </DialogHeader>

        {mutation.isError ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Unable to update expiration</AlertTitle>
            <AlertDescription>{errorMessage(mutation.error)}</AlertDescription>
          </Alert>
        ) : null}

        <form
          id={`api-key-expiration-${apiKey.id}`}
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate(dateTimeLocalToTimestamp(values.expiresAt)),
          )}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.expiresAt)}>
              <FieldLabel htmlFor={`api-key-expiry-${apiKey.id}`}>
                Expiration
              </FieldLabel>
              <Controller
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <ApiKeyExpirationField
                    id={`api-key-expiry-${apiKey.id}`}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={mutation.isPending}
                    invalid={Boolean(form.formState.errors.expiresAt)}
                  />
                )}
              />
              <FieldDescription>
                Leave empty for a key that never expires. Times use this browser&apos;s local timezone.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.expiresAt]} />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            type="submit"
            form={`api-key-expiration-${apiKey.id}`}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : null}
            Save expiration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ApiKeyDeleteDialog({ apiKey }: { apiKey: ApiKeySummary }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => deleteApiKey(apiKey.id),
    onSuccess: () => {
      queryClient.setQueryData<ApiKeySummary[]>(apiKeyKeys.all, (keys) =>
        keys?.filter((key) => key.id !== apiKey.id),
      )
      setOpen(false)
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (mutation.isPending) {
      return
    }

    setOpen(nextOpen)
    if (nextOpen) {
      mutation.reset()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="sm" className="text-destructive" />}
      >
        <Trash2Icon />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {apiKey.label}?</AlertDialogTitle>
          <AlertDialogDescription>
            Clients using this key will immediately lose access. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {mutation.isError ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Unable to delete API key</AlertTitle>
            <AlertDescription>{errorMessage(mutation.error)}</AlertDescription>
          </Alert>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : null}
            Delete API key
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function expirationDefaultValues(apiKey: ApiKeySummary): ExpirationValues {
  return {
    expiresAt: toDateTimeLocalValue(apiKey.expiresAt),
  }
}

function errorMessage(error: unknown): string {
  return apiErrorMessage(
    error,
    'The request could not be completed. Try again.',
  )
}
