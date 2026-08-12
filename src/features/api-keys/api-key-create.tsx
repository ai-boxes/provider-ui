import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  KeyRoundIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { createApiKey } from '@/features/api-keys/api-key-api'
import { ApiKeyExpirationField } from '@/features/api-keys/api-key-expiration-field'
import { ApiKeyProviderGroupField } from '@/features/api-keys/api-key-provider-group-field'
import { dateTimeLocalToTimestamp } from '@/features/api-keys/api-key-format'
import { ApiKeySecret } from '@/features/api-keys/api-key-secret'
import { invalidateApiKeyCaches } from '@/features/api-keys/api-keys-query'
import type { ProviderGroupCatalog } from '@/features/api-keys/provider-group-options'
import { apiErrorMessage } from '@/lib/api/error'

const apiKeyCreateSchema = z
  .object({
    label: z.string().trim().min(1, 'Name is required.'),
    groupLabel: z
      .string()
      .trim()
      .min(1, 'Provider group is required.')
      .max(64, 'Provider group must be 64 characters or fewer.'),
    key: z
      .string()
      .min(1, 'API key is required.')
      .max(1024, 'API key must be 1024 characters or fewer.')
      .regex(/^[!-~]+$/, 'Use non-whitespace ASCII characters only.'),
    quotaLimitUsd: z.string(),
    expiresAt: z.string(),
  })
  .superRefine((values, context) => {
    if (new TextEncoder().encode(values.label).length > 128) {
      context.addIssue({
        code: 'custom',
        path: ['label'],
        message: 'Name must be 128 bytes or fewer.',
      })
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
  })

type ApiKeyCreateValues = z.infer<typeof apiKeyCreateSchema>

const defaultValues: ApiKeyCreateValues = {
  label: '',
  groupLabel: '',
  key: '',
  quotaLimitUsd: '',
  expiresAt: '',
}

export function ApiKeyCreateDialog({
  providerGroups,
}: {
  providerGroups: ProviderGroupCatalog
}) {
  const [open, setOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<{
    label: string
    key: string
  } | null>(null)
  const [requestError, setRequestError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<ApiKeyCreateValues>({
    resolver: zodResolver(apiKeyCreateSchema),
    defaultValues,
  })

  function handleOpenChange(nextOpen: boolean) {
    if (submitting) {
      return
    }

    setOpen(nextOpen)
    resetDialog()
  }

  async function submit(values: ApiKeyCreateValues) {
    setSubmitting(true)
    setRequestError(null)

    try {
      const created = await createApiKey({
        key: values.key,
        label: values.label,
        groupLabel: values.groupLabel,
        quotaLimitUsd: values.quotaLimitUsd.trim() || null,
        expiresAt: dateTimeLocalToTimestamp(values.expiresAt),
      })
      form.reset(defaultValues)
      setCreatedKey({ label: created.label, key: created.key })
      invalidateApiKeyCaches(queryClient)
    } catch (error) {
      setRequestError(error)
    } finally {
      setSubmitting(false)
    }
  }

  function resetDialog() {
    form.reset(defaultValues)
    setCreatedKey(null)
    setRequestError(null)
  }

  const busy = submitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        Create API key
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {createdKey ? (
          <CreatedApiKeyResult label={createdKey.label} value={createdKey.key} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>Create a client credential.</DialogDescription>
            </DialogHeader>

            {requestError ? <CreateError error={requestError} /> : null}

            <form
              id="api-key-create-form"
              onSubmit={form.handleSubmit((values) => void submit(values))}
            >
              <FieldGroup>
                <Field data-invalid={Boolean(form.formState.errors.label)}>
                  <FieldLabel htmlFor="api-key-label">Name</FieldLabel>
                  <Input
                    id="api-key-label"
                    placeholder="Local development"
                    autoComplete="off"
                    disabled={busy}
                    aria-invalid={Boolean(form.formState.errors.label)}
                    {...form.register('label')}
                  />
                  <FieldError errors={[form.formState.errors.label]} />
                </Field>

                <Field data-invalid={Boolean(form.formState.errors.groupLabel)}>
                  <FieldLabel htmlFor="api-key-group">Provider group</FieldLabel>
                  <Controller
                    control={form.control}
                    name="groupLabel"
                    render={({ field }) => (
                      <ApiKeyProviderGroupField
                        id="api-key-group"
                        value={field.value}
                        onChange={field.onChange}
                        catalog={providerGroups}
                        disabled={busy}
                        invalid={Boolean(form.formState.errors.groupLabel)}
                      />
                    )}
                  />
                  <FieldError errors={[form.formState.errors.groupLabel]} />
                </Field>

                <Field data-invalid={Boolean(form.formState.errors.key)}>
                  <FieldLabel htmlFor="api-key-value">API key</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      id="api-key-value"
                      className="font-mono"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={busy}
                      aria-invalid={Boolean(form.formState.errors.key)}
                      {...form.register('key')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        form.setValue('key', generateApiKey(), {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }}
                    >
                      <RefreshCwIcon />
                      Generate
                    </Button>
                  </div>
                  <FieldError errors={[form.formState.errors.key]} />
                </Field>

                <Field
                  data-invalid={Boolean(form.formState.errors.quotaLimitUsd)}
                >
                  <FieldLabel htmlFor="api-key-quota-limit">
                    Quota limit (USD)
                  </FieldLabel>
                  <Input
                    id="api-key-quota-limit"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="Unlimited"
                    disabled={busy}
                    aria-invalid={Boolean(form.formState.errors.quotaLimitUsd)}
                    {...form.register('quotaLimitUsd')}
                  />
                  <FieldError errors={[form.formState.errors.quotaLimitUsd]} />
                </Field>

                <Field data-invalid={Boolean(form.formState.errors.expiresAt)}>
                  <FieldLabel htmlFor="api-key-expires-at">Expiration</FieldLabel>
                  <Controller
                    control={form.control}
                    name="expiresAt"
                    render={({ field }) => (
                      <ApiKeyExpirationField
                        id="api-key-expires-at"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={busy}
                        invalid={Boolean(form.formState.errors.expiresAt)}
                      />
                    )}
                  />
                  <FieldError errors={[form.formState.errors.expiresAt]} />
                </Field>

              </FieldGroup>
            </form>

            <DialogFooter>
              <DialogClose
                disabled={busy}
                render={<Button variant="outline" disabled={busy} />}
              >
                Cancel
              </DialogClose>
              <Button
                type="submit"
                form="api-key-create-form"
                disabled={
                  busy ||
                  providerGroups.status !== 'ready' ||
                  providerGroups.values.length === 0
                }
              >
                {submitting ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <KeyRoundIcon />
                )}
                Save API key
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CreatedApiKeyResult({ label, value }: { label: string; value: string }) {
  return (
    <>
      <DialogHeader>
        <div className="mb-1 flex size-10 items-center justify-center rounded-xl border bg-muted/45 text-muted-foreground">
          <KeyRoundIcon className="size-5" />
        </div>
        <DialogTitle>{label} is saved</DialogTitle>
        <DialogDescription>Copy the key to your client.</DialogDescription>
      </DialogHeader>
      <ApiKeySecret value={value} />
      <DialogFooter>
        <DialogClose render={<Button />}>Done</DialogClose>
      </DialogFooter>
    </>
  )
}

function generateApiKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function CreateError({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>Unable to create API key</AlertTitle>
      <AlertDescription>
        {apiErrorMessage(
          error,
          'The API key could not be created. Try again.',
        )}
      </AlertDescription>
    </Alert>
  )
}
