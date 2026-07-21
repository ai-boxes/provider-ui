import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  Loader2Icon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
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
import { Input } from '@/components/ui/input'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import {
  deleteProviderAccount,
  setProviderEnabled,
  updateProviderAccount,
} from '@/features/providers/provider-api'
import { providerKeys } from '@/features/providers/providers-query'
import type { ProviderAccount } from '@/features/providers/provider-types'
import { ApiError } from '@/lib/api/error'

const accountEditBaseSchema = z.object({
  label: z.string().trim().min(1, 'Label is required.'),
  visibility: z.enum(['private', 'shared']),
  baseUrl: z.string().trim(),
})

type AccountEditValues = z.infer<typeof accountEditBaseSchema>

export function ProviderAccountActions({
  account,
}: {
  account: ProviderAccount
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ProviderEditDialog account={account} />
      <ProviderDeleteDialog account={account} />
    </div>
  )
}

export function ProviderEnabledControl({
  account,
}: {
  account: ProviderAccount
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: setProviderEnabled,
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: providerKeys.detail(input.accountId),
      })
      const previous = queryClient.getQueryData<ProviderAccount>(
        providerKeys.detail(input.accountId),
      )

      if (previous) {
        queryClient.setQueryData(providerKeys.detail(input.accountId), {
          ...previous,
          enabled: input.enabled,
        })
      }

      return { previous }
    },
    onError: (_error, input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          providerKeys.detail(input.accountId),
          context.previous,
        )
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(providerKeys.detail(updated.id), updated)
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({
        queryKey: providerKeys.all,
        exact: true,
      })
      void queryClient.invalidateQueries({
        queryKey: providerKeys.detail(input.accountId),
      })
    },
  })

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <Switch
          checked={account.enabled}
          disabled={mutation.isPending}
          aria-label={account.enabled ? 'Disable provider' : 'Enable provider'}
          onCheckedChange={(enabled) =>
            mutation.mutate({ accountId: account.id, enabled })
          }
        />
        <span>{account.enabled ? 'Enabled' : 'Disabled'}</span>
        {mutation.isPending ? (
          <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {mutation.isError ? (
        <span role="alert" className="text-xs text-destructive">
          Unable to update the Provider state.
        </span>
      ) : null}
    </div>
  )
}

function ProviderEditDialog({ account }: { account: ProviderAccount }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const schema = useMemo(
    () =>
      accountEditBaseSchema.superRefine((values, context) => {
        if (
          account.provider !== 'grok' &&
          (!values.baseUrl || !isHttpUrl(values.baseUrl))
        ) {
          context.addIssue({
            code: 'custom',
            path: ['baseUrl'],
            message: 'Enter an absolute HTTP or HTTPS URL with a host.',
          })
        }
      }),
    [account.provider],
  )
  const form = useForm<AccountEditValues>({
    resolver: zodResolver(schema),
    defaultValues: editDefaultValues(account),
  })
  const updateAccount = useMutation({
    mutationFn: updateProviderAccount,
    onSuccess: (updated) => {
      queryClient.setQueryData(providerKeys.detail(updated.id), updated)
      void queryClient.invalidateQueries({
        queryKey: providerKeys.all,
        exact: true,
      })
      setOpen(false)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: providerKeys.detail(account.id),
      })
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (updateAccount.isPending) {
      return
    }

    setOpen(nextOpen)

    if (nextOpen) {
      form.reset(editDefaultValues(account))
      updateAccount.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <PencilIcon />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Provider</DialogTitle>
          <DialogDescription>
            Update account metadata. Credentials are managed separately.
          </DialogDescription>
        </DialogHeader>

        {updateAccount.isError ? (
          <MutationError
            title="Unable to update Provider"
            error={updateAccount.error}
          />
        ) : null}

        <form
          id="provider-edit-form"
          onSubmit={form.handleSubmit((values) =>
            updateAccount.mutate({
              accountId: account.id,
              label: values.label,
              visibility: values.visibility,
              baseUrl:
                account.provider === 'grok' ? undefined : values.baseUrl,
            }),
          )}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.label)}>
              <FieldLabel htmlFor="provider-edit-label">Label</FieldLabel>
              <Input
                id="provider-edit-label"
                disabled={updateAccount.isPending}
                aria-invalid={Boolean(form.formState.errors.label)}
                {...form.register('label')}
              />
              <FieldError errors={[form.formState.errors.label]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.visibility)}>
              <FieldLabel htmlFor="provider-edit-visibility">
                Visibility
              </FieldLabel>
              <NativeSelect
                id="provider-edit-visibility"
                className="w-full"
                disabled={updateAccount.isPending}
                aria-invalid={Boolean(form.formState.errors.visibility)}
                {...form.register('visibility')}
              >
                <NativeSelectOption value="private">Private</NativeSelectOption>
                <NativeSelectOption value="shared">Shared</NativeSelectOption>
              </NativeSelect>
              <FieldDescription>
                Shared Providers can be used by other users but remain editable
                only by their owner.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.visibility]} />
            </Field>

            {account.provider !== 'grok' ? (
              <Field data-invalid={Boolean(form.formState.errors.baseUrl)}>
                <FieldLabel htmlFor="provider-edit-base-url">
                  Base URL
                </FieldLabel>
                <Input
                  id="provider-edit-base-url"
                  type="url"
                  disabled={updateAccount.isPending}
                  aria-invalid={Boolean(form.formState.errors.baseUrl)}
                  {...form.register('baseUrl')}
                />
                <FieldError errors={[form.formState.errors.baseUrl]} />
              </Field>
            ) : null}
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form="provider-edit-form"
            disabled={updateAccount.isPending}
          >
            {updateAccount.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProviderDeleteDialog({ account }: { account: ProviderAccount }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const deleteAccount = useMutation({
    mutationFn: () => deleteProviderAccount(account.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: providerKeys.detail(account.id) })
      queryClient.removeQueries({ queryKey: providerKeys.models(account.id) })
      void queryClient.invalidateQueries({
        queryKey: providerKeys.all,
        exact: true,
      })
      setOpen(false)
      navigate('/providers', { replace: true })
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (deleteAccount.isPending) {
      return
    }

    setOpen(nextOpen)

    if (nextOpen) {
      deleteAccount.reset()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        <Trash2Icon />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {account.label}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the Provider account and its stored model
            catalog. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {deleteAccount.isError ? (
          <MutationError
            title="Unable to delete Provider"
            error={deleteAccount.error}
          />
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteAccount.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteAccount.isPending}
            onClick={() => deleteAccount.mutate()}
          >
            {deleteAccount.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : null}
            Delete Provider
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function MutationError({
  title,
  error,
}: {
  title: string
  error: unknown
}) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {error instanceof ApiError
          ? error.message
          : 'The request could not be completed. Try again.'}
      </AlertDescription>
    </Alert>
  )
}

function editDefaultValues(account: ProviderAccount): AccountEditValues {
  return {
    label: account.label,
    visibility: account.visibility,
    baseUrl: account.baseUrl ?? '',
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.host
  } catch {
    return false
  }
}
