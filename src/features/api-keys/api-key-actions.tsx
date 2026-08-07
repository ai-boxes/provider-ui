import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  EyeIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PowerIcon,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
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
import { providersQueryOptions } from '@/features/providers/providers-query'
import { apiErrorMessage } from '@/lib/api/error'
import { replaceListItem } from '@/lib/api/query-cache'

export function ApiKeyActions({
  apiKey,
  now,
}: {
  apiKey: ApiKeySummary
  now: number
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const queryClient = useQueryClient()
  const expired = apiKey.expiresAt !== null && apiKey.expiresAt <= now
  const statusMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      updateApiKey({ keyId: apiKey.id, enabled }),
    onSuccess: (updated) => replaceListItem(queryClient, apiKeyKeys.all, updated),
  })

  return (
    <div className="grid justify-items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${apiKey.label}`}
              title="Actions"
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate(!apiKey.enabled)}
          >
            {statusMutation.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <PowerIcon />
            )}
            {apiKey.enabled ? 'Disable' : 'Enable'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {statusMutation.isError ? (
        <span role="alert" className="text-xs text-destructive">
          Unable to update key status.
        </span>
      ) : expired && apiKey.enabled ? (
        <span className="max-w-32 text-right text-xs text-muted-foreground">
          Expired until edited
        </span>
      ) : null}
      <ApiKeyEditDialog
        apiKey={apiKey}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ApiKeyDeleteDialog
        apiKey={apiKey}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  )
}

export function ApiKeyRevealDialog({ apiKey }: { apiKey: ApiKeySummary }) {
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
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <EyeIcon />
        View
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

const editSchema = z
  .object({
    label: z.string().trim().min(1, 'Name is required.'),
    groupLabel: z.string().trim().min(1, 'Provider group is required.'),
    expiresAt: z.string(),
    quotaLimitUsd: z.string(),
  })
  .superRefine((values, context) => {
    if (new TextEncoder().encode(values.label).length > 128) {
      context.addIssue({
        code: 'custom',
        path: ['label'],
        message: 'Name must be 128 bytes or fewer.',
      })
    }

    if (values.expiresAt) {
      const timestamp = dateTimeLocalToTimestamp(values.expiresAt)
      if (timestamp === null || timestamp <= Date.now() / 1000) {
        context.addIssue({
          code: 'custom',
          path: ['expiresAt'],
          message: 'Choose a future date and time or clear the expiration.',
        })
      }
    }

    if (values.quotaLimitUsd.trim()) {
      if (
        !/^\d+(\.\d{1,14})?$/.test(values.quotaLimitUsd.trim()) ||
        !/[1-9]/.test(values.quotaLimitUsd)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['quotaLimitUsd'],
          message:
            'Use a positive USD amount (e.g. 10 or 12.5) or leave empty for unlimited.',
        })
      }
    }
  })

type EditValues = z.infer<typeof editSchema>

function ApiKeyEditDialog({
  apiKey,
  open,
  onOpenChange,
}: {
  apiKey: ApiKeySummary
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const providers = useQuery({
    ...providersQueryOptions,
    enabled: open,
  })
  const groupLabels = Array.from(
    new Set(
      (providers.data ?? [])
        .filter((account) => account.enabled)
        .map((account) => account.groupLabel.trim()),
    ),
  ).sort((left, right) => left.localeCompare(right))
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: editDefaultValues(apiKey),
  })
  const mutation = useMutation({
    mutationFn: (values: EditValues) =>
      updateApiKey({
        keyId: apiKey.id,
        label: values.label,
        groupLabel: values.groupLabel,
        expiresAt: dateTimeLocalToTimestamp(values.expiresAt),
        quotaLimitUsd: values.quotaLimitUsd.trim()
          ? values.quotaLimitUsd.trim()
          : null,
    }),
    onSuccess: (updated) => {
      replaceListItem(queryClient, apiKeyKeys.all, updated)
      onOpenChange(false)
    },
  })
  const busy = mutation.isPending

  function handleOpenChange(nextOpen: boolean) {
    if (mutation.isPending) {
      return
    }

    onOpenChange(nextOpen)
    if (nextOpen) {
      form.reset(editDefaultValues(apiKey))
      mutation.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {apiKey.label}</DialogTitle>
          <DialogDescription>
            Update the name, provider group, expiration, and estimated USD quota.
          </DialogDescription>
        </DialogHeader>

        {mutation.isError ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Unable to update API key</AlertTitle>
            <AlertDescription>{errorMessage(mutation.error)}</AlertDescription>
          </Alert>
        ) : null}

        <form
          id={`api-key-edit-${apiKey.id}`}
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.label)}>
              <FieldLabel htmlFor={`api-key-name-${apiKey.id}`}>Name</FieldLabel>
              <Input
                id={`api-key-name-${apiKey.id}`}
                autoComplete="off"
                disabled={busy}
                aria-invalid={Boolean(form.formState.errors.label)}
                {...form.register('label')}
              />
              <FieldDescription>
                Use a name that identifies the client or environment.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.label]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.groupLabel)}>
              <FieldLabel htmlFor={`api-key-group-${apiKey.id}`}>
                Provider group
              </FieldLabel>
              <NativeSelect
                id={`api-key-group-${apiKey.id}`}
                className="w-full"
                disabled={busy || providers.isPending}
                aria-invalid={Boolean(form.formState.errors.groupLabel)}
                {...form.register('groupLabel')}
              >
                <NativeSelectOption value="">
                  {providers.isPending
                    ? 'Loading groups…'
                    : groupLabels.length
                      ? 'Select a group'
                      : 'No groups available'}
                </NativeSelectOption>
                {groupLabels.map((groupLabel) => (
                  <NativeSelectOption key={groupLabel} value={groupLabel}>
                    {groupLabel}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>
                Uses provider accounts that share this group label.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.groupLabel]} />
              {providers.isError ? (
                <p role="alert" className="text-xs text-destructive">
                  Unable to load provider accounts.
                </p>
              ) : null}
            </Field>

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
                    disabled={busy}
                    invalid={Boolean(form.formState.errors.expiresAt)}
                  />
                )}
              />
              <FieldDescription>
                Leave empty for a key that never expires.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.expiresAt]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.quotaLimitUsd)}>
              <FieldLabel htmlFor={`api-key-quota-${apiKey.id}`}>
                Quota limit (USD)
              </FieldLabel>
              <Input
                id={`api-key-quota-${apiKey.id}`}
                inputMode="decimal"
                autoComplete="off"
                placeholder="Unlimited"
                disabled={busy}
                aria-invalid={Boolean(form.formState.errors.quotaLimitUsd)}
                {...form.register('quotaLimitUsd')}
              />
              <FieldError errors={[form.formState.errors.quotaLimitUsd]} />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            type="submit"
            form={`api-key-edit-${apiKey.id}`}
            disabled={busy}
          >
            {mutation.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ApiKeyDeleteDialog({
  apiKey,
  open,
  onOpenChange,
}: {
  apiKey: ApiKeySummary
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => deleteApiKey(apiKey.id),
    onSuccess: () => {
      queryClient.setQueryData<ApiKeySummary[]>(apiKeyKeys.all, (keys) =>
        keys?.filter((key) => key.id !== apiKey.id),
      )
      onOpenChange(false)
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (mutation.isPending) {
      return
    }

    onOpenChange(nextOpen)
    if (nextOpen) {
      mutation.reset()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
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

function editDefaultValues(apiKey: ApiKeySummary): EditValues {
  return {
    label: apiKey.label,
    groupLabel: apiKey.groupLabel,
    expiresAt: toDateTimeLocalValue(apiKey.expiresAt),
    quotaLimitUsd: compactUsd(apiKey.quotaLimitUsd),
  }
}

function compactUsd(value: string | null): string {
  if (!value) {
    return ''
  }
  const [whole, fraction = ''] = value.split('.')
  const trimmedFraction = fraction.replace(/0+$/, '')
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole
}

function errorMessage(error: unknown): string {
  return apiErrorMessage(
    error,
    'The request could not be completed. Try again.',
  )
}
