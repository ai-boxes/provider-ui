import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  Loader2Icon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
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
import { apiKeysQueryOptions } from '@/features/api-keys/api-keys-query'
import {
  deleteProviderAccount,
  setProviderEnabled,
  updateProviderAccount,
} from '@/features/providers/provider-api'
import {
  isCompatibleProvider,
  isOAuthProvider,
} from '@/features/providers/provider-format'
import {
  providerKeys,
  providersQueryOptions,
} from '@/features/providers/providers-query'
import type { ProviderAccount } from '@/features/providers/provider-types'
import { ApiError } from '@/lib/api/error'

const accountEditBaseSchema = z.object({
  label: z.string().trim().min(1, 'Label is required.'),
  groupLabel: z
    .string()
    .trim()
    .min(1, 'Provider group is required.')
    .refine(
      (value) => [...value].length <= 64,
      'Provider group must be 64 characters or fewer.',
    ),
  visibility: z.enum(['private', 'shared']),
  baseUrl: z.string().trim(),
  apiKey: z.string(),
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
  const [confirmDisable, setConfirmDisable] = useState(false)
  const queryClient = useQueryClient()
  const providers = useQuery({
    ...providersQueryOptions,
    enabled: confirmDisable && account.visibility === 'private',
  })
  const apiKeys = useQuery({
    ...apiKeysQueryOptions,
    enabled: confirmDisable && account.visibility === 'private',
  })
  const impact = providerGroupImpact(
    account,
    providers.data,
    apiKeys.data,
    providers.isPending || apiKeys.isPending,
    providers.isError || apiKeys.isError,
  )
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
      setConfirmDisable(false)
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
          onCheckedChange={(enabled) => {
            if (enabled) {
              mutation.mutate({ accountId: account.id, enabled })
            } else {
              setConfirmDisable(true)
            }
          }}
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
      <AlertDialog open={confirmDisable} onOpenChange={setConfirmDisable}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <CircleAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Disable {account.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {account.visibility === 'shared'
                ? `API keys owned by you or other users may route through the shared “${account.groupLabel}” group. Disabling this account may leave some users without an eligible Provider.`
                : privateDisableImpact(account, impact)}
              {' '}Re-enable this account, enable another Provider in the
              group, or move the API keys to restore routing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>
              Keep enabled
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                mutation.isPending ||
                (account.visibility === 'private' && impact.pending)
              }
              onClick={() =>
                mutation.mutate({ accountId: account.id, enabled: false })
              }
            >
              {mutation.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              Disable Provider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function ProviderEditDialog({ account }: { account: ProviderAccount }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const apiKeys = useQuery({
    ...apiKeysQueryOptions,
    enabled: open && account.visibility === 'private',
  })
  const schema = useMemo(
    () =>
      accountEditBaseSchema.superRefine((values, context) => {
        if (
          !isOAuthProvider(account.provider) &&
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
  const formId = `provider-edit-form-${account.id}`
  const fieldId = (name: string) => `provider-edit-${name}-${account.id}`
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
  const nextGroupLabel = form.watch('groupLabel').trim()
  const groupChanged =
    nextGroupLabel.length > 0 && nextGroupLabel !== account.groupLabel
  const affectedKeyCount =
    apiKeys.isSuccess
      ? apiKeys.data.filter((key) => key.groupLabel === account.groupLabel).length
      : null

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
        </DialogHeader>

        {updateAccount.isError ? (
          <MutationError
            title="Unable to update Provider"
            error={updateAccount.error}
          />
        ) : null}

        {groupChanged ? (
          <Alert>
            <CircleAlertIcon />
            <AlertTitle>API keys are not moved automatically</AlertTitle>
            <AlertDescription>
              {account.visibility === 'shared'
                ? `API keys owned by you or other users may use the shared “${account.groupLabel}” group.`
                : apiKeys.isError
                  ? `API keys owned by you may use “${account.groupLabel}”, but their count could not be loaded.`
                : affectedKeyCount === null
                  ? `Checking API keys that use “${account.groupLabel}”.`
                  : `${affectedKeyCount} API key${affectedKeyCount === 1 ? '' : 's'} owned by you currently use “${account.groupLabel}”.`}
              {' '}Saving changes only this Provider to “{nextGroupLabel}”;
              existing keys keep their current group.{' '}
              <Link className="font-medium underline underline-offset-4" to="/api-keys">
                Review API keys
              </Link>
              {' '}to move them deliberately.
            </AlertDescription>
          </Alert>
        ) : null}

        <form
          id={formId}
          onSubmit={form.handleSubmit((values) =>
            updateAccount.mutate({
              accountId: account.id,
              label: values.label,
              groupLabel: values.groupLabel,
              visibility: values.visibility,
              baseUrl: isOAuthProvider(account.provider)
                ? undefined
                : values.baseUrl,
              apiKey: isCompatibleProvider(account.provider)
                ? values.apiKey
                : undefined,
            }),
          )}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.label)}>
              <FieldLabel htmlFor={fieldId('label')}>Label</FieldLabel>
              <Input
                id={fieldId('label')}
                disabled={updateAccount.isPending}
                aria-invalid={Boolean(form.formState.errors.label)}
                {...form.register('label')}
              />
              <FieldError errors={[form.formState.errors.label]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.groupLabel)}>
              <FieldLabel htmlFor={fieldId('group-label')}>
                Provider group
              </FieldLabel>
              <Input
                id={fieldId('group-label')}
                disabled={updateAccount.isPending}
                aria-invalid={Boolean(form.formState.errors.groupLabel)}
                {...form.register('groupLabel')}
              />
              <FieldDescription>
                API keys select this label to route through matching accounts.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.groupLabel]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.visibility)}>
              <FieldLabel htmlFor={fieldId('visibility')}>
                Visibility
              </FieldLabel>
              <NativeSelect
                id={fieldId('visibility')}
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

            {!isOAuthProvider(account.provider) ? (
              <Field data-invalid={Boolean(form.formState.errors.baseUrl)}>
                <FieldLabel htmlFor={fieldId('base-url')}>
                  Base URL
                </FieldLabel>
                <Input
                  id={fieldId('base-url')}
                  type="url"
                  disabled={updateAccount.isPending}
                  aria-invalid={Boolean(form.formState.errors.baseUrl)}
                  {...form.register('baseUrl')}
                />
                <FieldError errors={[form.formState.errors.baseUrl]} />
              </Field>
            ) : null}

            {isCompatibleProvider(account.provider) ? (
              <Field data-invalid={Boolean(form.formState.errors.apiKey)}>
                <FieldLabel htmlFor={fieldId('api-key')}>API Key</FieldLabel>
                <Input
                  id={fieldId('api-key')}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current"
                  disabled={updateAccount.isPending}
                  aria-invalid={Boolean(form.formState.errors.apiKey)}
                  {...form.register('apiKey')}
                />
                <FieldError errors={[form.formState.errors.apiKey]} />
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
            form={formId}
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
  const providers = useQuery({
    ...providersQueryOptions,
    enabled: open && account.visibility === 'private',
  })
  const apiKeys = useQuery({
    ...apiKeysQueryOptions,
    enabled: open && account.visibility === 'private',
  })
  const impact = providerGroupImpact(
    account,
    providers.data,
    apiKeys.data,
    providers.isPending || apiKeys.isPending,
    providers.isError || apiKeys.isError,
  )
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
            catalog. API keys are not deleted or moved.{' '}
            {account.visibility === 'shared'
              ? `API keys owned by you or other users may route through the shared “${account.groupLabel}” group. Deletion may leave some users without an eligible Provider.`
              : privateDeleteImpact(account, impact)}
            {' '}To restore affected routing, move those keys or add an enabled
            Provider with the same group label. This action cannot be undone.
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
            disabled={
              deleteAccount.isPending ||
              (account.visibility === 'private' && impact.pending)
            }
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
    groupLabel: account.groupLabel,
    visibility: account.visibility,
    baseUrl: account.baseUrl ?? '',
    apiKey: '',
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

function providerGroupImpact(
  account: ProviderAccount,
  providers: ProviderAccount[] | undefined,
  apiKeys: Array<{ groupLabel: string }> | undefined,
  pending: boolean,
  failed: boolean,
): {
  ready: boolean
  pending: boolean
  failed: boolean
  apiKeyCount: number
  alternativeEnabledProviders: number
} {
  return {
    ready: !pending && !failed,
    pending,
    failed,
    apiKeyCount:
      apiKeys?.filter((key) => key.groupLabel === account.groupLabel).length ?? 0,
    alternativeEnabledProviders:
      providers?.filter(
        (provider) =>
          provider.id !== account.id &&
          provider.enabled &&
          provider.groupLabel === account.groupLabel,
      ).length ?? 0,
  }
}

function privateDisableImpact(
  account: ProviderAccount,
  impact: ReturnType<typeof providerGroupImpact>,
): string {
  if (!impact.ready) {
    if (impact.failed) {
      return `API keys owned by you may use “${account.groupLabel}”, but their routing impact could not be loaded. Disabling this account may leave those keys without an enabled Provider.`
    }
    return `Checking API keys and enabled Providers in “${account.groupLabel}” before disabling this account.`
  }

  if (impact.alternativeEnabledProviders > 0) {
    return `${impact.apiKeyCount} API key${impact.apiKeyCount === 1 ? '' : 's'} owned by you use “${account.groupLabel}”. They can continue routing through ${impact.alternativeEnabledProviders} other enabled Provider${impact.alternativeEnabledProviders === 1 ? '' : 's'} available to you in this group.`
  }

  return `${impact.apiKeyCount} API key${impact.apiKeyCount === 1 ? '' : 's'} owned by you use “${account.groupLabel}”. Disabling this account leaves you without an enabled Provider in that group, so those keys cannot route requests.`
}

function privateDeleteImpact(
  account: ProviderAccount,
  impact: ReturnType<typeof providerGroupImpact>,
): string {
  if (!impact.ready) {
    if (impact.failed) {
      return `API keys owned by you may use “${account.groupLabel}”, but their routing impact could not be loaded. Deletion may leave those keys without an enabled Provider.`
    }
    return `Checking API keys and enabled Providers in “${account.groupLabel}” before deletion.`
  }

  if (impact.alternativeEnabledProviders > 0) {
    return `${impact.apiKeyCount} key${impact.apiKeyCount === 1 ? '' : 's'} owned by you can continue routing through ${impact.alternativeEnabledProviders} other enabled Provider${impact.alternativeEnabledProviders === 1 ? '' : 's'} available to you in “${account.groupLabel}”.`
  }

  return `${impact.apiKeyCount} key${impact.apiKeyCount === 1 ? '' : 's'} owned by you use “${account.groupLabel}”, which will have no enabled Provider available to you after deletion.`
}
