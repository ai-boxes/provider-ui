import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleAlertIcon, Loader2Icon, PencilIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from 'zod'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { apiKeysQueryOptions } from '@/features/api-keys/api-keys-query'
import { updateProviderAccount } from '@/features/providers/provider-api'
import { isCompatibleProvider, isOAuthProvider } from '@/features/providers/provider-format'
import { providerKeys } from '@/features/providers/providers-query'
import type { ProviderAccount } from '@/features/providers/provider-types'
import { ApiError } from '@/lib/api/error'

const accountEditBaseSchema = z.object({
  label: z.string().trim().min(1, 'Label is required.'),
  groupLabel: z.string().trim().min(1, 'Provider group is required.').refine(
    (value) => [...value].length <= 64,
    'Provider group must be 64 characters or fewer.',
  ),
  visibility: z.enum(['private', 'shared']),
  baseUrl: z.string().trim(),
  apiKey: z.string(),
  priority: z.number({ error: 'Priority must be a non-negative integer.' })
    .int('Priority must be a non-negative integer.')
    .nonnegative('Priority must be a non-negative integer.'),
})

type AccountEditValues = z.infer<typeof accountEditBaseSchema>

function editDefaultValues(account: ProviderAccount): AccountEditValues {
  return {
    label: account.label,
    groupLabel: account.groupLabel,
    visibility: account.visibility,
    baseUrl: account.baseUrl ?? '',
    apiKey: '',
    priority: account.priority,
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
              priority: values.priority,
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
              <FieldDescription>Used by API keys for routing.</FieldDescription>
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
                Shared with all users; editable by the owner.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.visibility]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.priority)}>
              <FieldLabel htmlFor={fieldId('priority')}>Priority</FieldLabel>
              <Input
                id={fieldId('priority')}
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                autoComplete="off"
                disabled={updateAccount.isPending}
                aria-invalid={Boolean(form.formState.errors.priority)}
                {...form.register('priority', { valueAsNumber: true })}
              />
              <FieldDescription>Lower numbers route first.</FieldDescription>
              <FieldError errors={[form.formState.errors.priority]} />
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
          <DialogClose
            disabled={updateAccount.isPending}
            render={
              <Button variant="outline" disabled={updateAccount.isPending} />
            }
          >
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
