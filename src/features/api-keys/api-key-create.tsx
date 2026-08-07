import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  createApiKey,
  generateApiKey,
} from '@/features/api-keys/api-key-api'
import { ApiKeyExpirationField } from '@/features/api-keys/api-key-expiration-field'
import { dateTimeLocalToTimestamp } from '@/features/api-keys/api-key-format'
import { ApiKeySecret } from '@/features/api-keys/api-key-secret'
import { apiKeyKeys } from '@/features/api-keys/api-keys-query'
import type { ApiKeyDetail } from '@/features/api-keys/api-key-types'
import { providersQueryOptions } from '@/features/providers/providers-query'
import { apiErrorMessage } from '@/lib/api/error'

const apiKeyCreateSchema = z
  .object({
    label: z.string().trim().min(1, 'Name is required.'),
    groupLabel: z.string().trim().min(1, 'Provider group is required.'),
    key: z.string(),
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

    if ([...values.key].length < 16) {
      context.addIssue({
        code: 'custom',
        path: ['key'],
        message: 'Key must contain at least 16 characters.',
      })
    }

    if (!/^[A-Za-z0-9_-]+$/.test(values.key)) {
      context.addIssue({
        code: 'custom',
        path: ['key'],
        message: 'Use only letters, numbers, hyphens, and underscores.',
      })
    }

    if (new TextEncoder().encode(values.key).length > 256) {
      context.addIssue({
        code: 'custom',
        path: ['key'],
        message: 'Key must be 256 bytes or fewer.',
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
  expiresAt: '',
  quotaLimitUsd: '',
}

export function ApiKeyCreateDialog() {
  const [open, setOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<ApiKeyDetail | null>(null)
  const [requestError, setRequestError] = useState<unknown>(null)
  const [generateError, setGenerateError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const queryClient = useQueryClient()
  const providers = useQuery(providersQueryOptions)
  const groupLabels = Array.from(
    new Set(
      (providers.data ?? [])
        .filter((account) => account.enabled)
        .map((account) => account.groupLabel)
    ),
  ).sort((left, right) => left.localeCompare(right))
  const form = useForm<ApiKeyCreateValues>({
    resolver: zodResolver(apiKeyCreateSchema),
    defaultValues,
  })

  function handleOpenChange(nextOpen: boolean) {
    if (submitting || generating) {
      return
    }

    setOpen(nextOpen)
    resetDialog()
  }

  async function generate() {
    setGenerating(true)
    setGenerateError(null)

    try {
      const key = await generateApiKey()
      form.setValue('key', key, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    } catch (error) {
      setGenerateError(error)
    } finally {
      setGenerating(false)
    }
  }

  async function submit(values: ApiKeyCreateValues) {
    setSubmitting(true)
    setRequestError(null)

    try {
      const quotaLimitUsd = values.quotaLimitUsd.trim()
        ? values.quotaLimitUsd.trim()
        : null
      const created = await createApiKey({
        label: values.label,
        groupLabel: values.groupLabel,
        key: values.key,
        expiresAt: dateTimeLocalToTimestamp(values.expiresAt),
        quotaLimitUsd,
      })
      form.reset(defaultValues)
      setCreatedKey(created)
      void queryClient.invalidateQueries({
        queryKey: apiKeyKeys.all,
        exact: true,
      })
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
    setGenerateError(null)
  }

  const busy = submitting || generating

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
              <DialogDescription>
                Create a downstream credential for Codex, Claude, or another API client.
              </DialogDescription>
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
                  <FieldDescription>
                    Use a name that identifies the client or environment.
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.label]} />
                </Field>

                <Field data-invalid={Boolean(form.formState.errors.groupLabel)}>
                  <FieldLabel htmlFor="api-key-group">Provider group</FieldLabel>
                  <NativeSelect
                    id="api-key-group"
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

                <Field data-invalid={Boolean(form.formState.errors.key)}>
                  <FieldLabel htmlFor="api-key-value">Key value</FieldLabel>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="api-key-value"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="At least 16 URL-safe characters"
                      disabled={busy}
                      aria-invalid={Boolean(form.formState.errors.key)}
                      className="min-w-0 flex-1 font-mono"
                      {...form.register('key')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      disabled={busy}
                      onClick={() => void generate()}
                    >
                      {generating ? (
                        <Loader2Icon className="animate-spin" />
                      ) : (
                        <RefreshCwIcon />
                      )}
                      {generating ? 'Generating…' : 'Generate'}
                    </Button>
                  </div>
                  <FieldDescription>
                    Enter a URL-safe key or ask the server to generate one.
                    Maximum 256 bytes.
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.key]} />
                  {generateError ? (
                    <p role="alert" className="text-xs text-destructive">
                      {apiErrorMessage(generateError, 'The server could not generate a key.')}
                    </p>
                  ) : null}
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
                  <FieldDescription>
                    Leave empty for a key that never expires. Times use this
                    browser&apos;s local timezone.
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.expiresAt]} />
                </Field>

                <Field
                  data-invalid={Boolean(
                    form.formState.errors.quotaLimitUsd,
                  )}
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
              </FieldGroup>
            </form>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" form="api-key-create-form" disabled={busy}>
                {submitting ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <KeyRoundIcon />
                )}
                Create API key
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
        <DialogTitle>{label} is ready</DialogTitle>
        <DialogDescription>
          Copy this key into the client that will call the Provider API. You can
          reveal it again from this page.
        </DialogDescription>
      </DialogHeader>
      <ApiKeySecret value={value} />
      <DialogFooter>
        <DialogClose render={<Button />}>Done</DialogClose>
      </DialogFooter>
    </>
  )
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
