import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleAlertIcon, Loader2Icon, UploadIcon } from 'lucide-react'
import { useState, type ChangeEvent, type ReactNode } from 'react'
import {
  useForm,
  type FieldError as ReactHookFormFieldError,
  type UseFormRegisterReturn,
} from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import {
  createCompatibleProvider,
  importGrokProvider,
  startGrokOAuth,
} from '@/features/providers/provider-api'
import { providerKeys } from '@/features/providers/providers-query'
import type {
  CreatedProviderAccount,
  ProviderKind,
} from '@/features/providers/provider-types'
import { ApiError } from '@/lib/api/error'

const providerBaseSchema = z.object({
  label: z.string().trim().min(1, 'Label is required.'),
  visibility: z.enum(['private', 'shared']),
})

const compatibleProviderSchema = providerBaseSchema.extend({
  baseUrl: z
    .string()
    .trim()
    .min(1, 'Base URL is required.')
    .refine(isHttpUrl, 'Enter an absolute HTTP or HTTPS URL with a host.'),
  apiKey: z.string().transform((value) => value.trim()),
})

const grokJsonImportSchema = providerBaseSchema.extend({
  credentialJson: z
    .string()
    .trim()
    .min(1, 'Credential JSON is required.')
    .superRefine((value, context) => {
      try {
        const document = JSON.parse(value) as unknown

        if (
          typeof document !== 'object' ||
          document === null ||
          Array.isArray(document)
        ) {
          context.addIssue({
            code: 'custom',
            message: 'Credential JSON must contain a JSON object.',
          })
        }
      } catch {
        context.addIssue({
          code: 'custom',
          message: 'Credential JSON is not valid JSON.',
        })
      }
    }),
})

type ProviderBaseValues = z.infer<typeof providerBaseSchema>
type CompatibleProviderValues = z.infer<typeof compatibleProviderSchema>
type GrokJsonImportValues = z.infer<typeof grokJsonImportSchema>

const defaultBaseValues: ProviderBaseValues = {
  label: '',
  visibility: 'private',
}

export function GrokOAuthStartForm() {
  const [, setSearchParams] = useSearchParams()
  const form = useForm<ProviderBaseValues>({
    resolver: zodResolver(providerBaseSchema),
    defaultValues: defaultBaseValues,
  })
  const startOAuth = useMutation({
    mutationFn: startGrokOAuth,
    onSuccess: (session) => {
      setSearchParams({ oauth_session: session.id }, { replace: true })
    },
  })

  return (
    <ProviderFormCard
      title="Provider details"
      description="These settings are applied to the account created after authorization completes."
      error={startOAuth.error}
      footer={
        <Button
          type="submit"
          form="grok-oauth-form"
          disabled={startOAuth.isPending}
        >
          {startOAuth.isPending ? <Loader2Icon className="animate-spin" /> : null}
          Start authorization
        </Button>
      }
    >
      <form
        id="grok-oauth-form"
        onSubmit={form.handleSubmit((values) => startOAuth.mutate(values))}
      >
        <FieldGroup>
          <ProviderBaseFields
            disabled={startOAuth.isPending}
            labelRegistration={form.register('label')}
            visibilityRegistration={form.register('visibility')}
            labelError={form.formState.errors.label}
            visibilityError={form.formState.errors.visibility}
          />
        </FieldGroup>
      </form>
    </ProviderFormCard>
  )
}

export function GrokJsonImportForm() {
  const finishCreation = useFinishProviderCreation()
  const [fileError, setFileError] = useState<string | null>(null)
  const form = useForm<GrokJsonImportValues>({
    resolver: zodResolver(grokJsonImportSchema),
    defaultValues: {
      ...defaultBaseValues,
      credentialJson: '',
    },
  })
  const importProvider = useMutation({
    mutationFn: importGrokProvider,
    onSuccess: finishCreation,
  })

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setFileError(null)

    try {
      const content = await file.text()
      form.setValue('credentialJson', content, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    } catch {
      setFileError('Unable to read the selected JSON file.')
    }
  }

  return (
    <ProviderFormCard
      title="Provider details and credential"
      description="Credential content stays in this form until it is submitted to the provider API."
      error={importProvider.error}
      footer={
        <Button
          type="submit"
          form="grok-json-form"
          disabled={importProvider.isPending}
        >
          {importProvider.isPending ? (
            <Loader2Icon className="animate-spin" />
          ) : null}
          Create provider
        </Button>
      }
    >
      <form
        id="grok-json-form"
        onSubmit={form.handleSubmit((values) => {
          importProvider.mutate({
            label: values.label,
            visibility: values.visibility,
            credentialJson: JSON.parse(values.credentialJson) as Record<
              string,
              unknown
            >,
          })
        })}
      >
        <FieldGroup>
          <ProviderBaseFields
            disabled={importProvider.isPending}
            labelRegistration={form.register('label')}
            visibilityRegistration={form.register('visibility')}
            labelError={form.formState.errors.label}
            visibilityError={form.formState.errors.visibility}
          />

          <Field data-invalid={Boolean(fileError)}>
            <FieldLabel htmlFor="credential-file">Load a JSON file</FieldLabel>
            <div className="rounded-xl border border-dashed bg-muted/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-foreground/10">
                  <UploadIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Choose a credential file</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    The file is read locally and its text replaces the editable
                    field below.
                  </p>
                </div>
                <Input
                  id="credential-file"
                  type="file"
                  accept=".json,application/json"
                  className="sm:max-w-64"
                  disabled={importProvider.isPending}
                  aria-invalid={Boolean(fileError)}
                  onChange={(event) => void handleFileChange(event)}
                />
              </div>
            </div>
            <FieldError>{fileError}</FieldError>
          </Field>

          <Field
            data-invalid={Boolean(form.formState.errors.credentialJson)}
          >
            <FieldLabel htmlFor="credential-json">
              Credential JSON
            </FieldLabel>
            <Textarea
              id="credential-json"
              rows={14}
              spellCheck={false}
              className="min-h-72 resize-y font-mono text-xs leading-5"
              placeholder={'{\n  "type": "xai",\n  ...\n}'}
              disabled={importProvider.isPending}
              aria-invalid={Boolean(form.formState.errors.credentialJson)}
              {...form.register('credentialJson')}
            />
            <FieldDescription>
              Review or edit the current content before creating the Provider.
            </FieldDescription>
            <FieldError
              errors={[form.formState.errors.credentialJson]}
            />
          </Field>
        </FieldGroup>
      </form>
    </ProviderFormCard>
  )
}

export function CompatibleProviderForm({
  provider,
}: {
  provider: Exclude<ProviderKind, 'grok'>
}) {
  const finishCreation = useFinishProviderCreation()
  const form = useForm<CompatibleProviderValues>({
    resolver: zodResolver(compatibleProviderSchema),
    defaultValues: {
      ...defaultBaseValues,
      baseUrl: '',
      apiKey: '',
    },
  })
  const createProvider = useMutation({
    mutationFn: createCompatibleProvider,
    onSuccess: finishCreation,
  })

  return (
    <ProviderFormCard
      title="Provider configuration"
      description="The base URL should point to the upstream API root used by this compatible provider."
      error={createProvider.error}
      footer={
        <Button
          type="submit"
          form="compatible-provider-form"
          disabled={createProvider.isPending}
        >
          {createProvider.isPending ? (
            <Loader2Icon className="animate-spin" />
          ) : null}
          Create provider
        </Button>
      }
    >
      <form
        id="compatible-provider-form"
        onSubmit={form.handleSubmit((values) => {
          createProvider.mutate({
            provider,
            label: values.label,
            visibility: values.visibility,
            baseUrl: values.baseUrl,
            apiKey: values.apiKey || undefined,
          })
        })}
      >
        <FieldGroup>
          <ProviderBaseFields
            disabled={createProvider.isPending}
            labelRegistration={form.register('label')}
            visibilityRegistration={form.register('visibility')}
            labelError={form.formState.errors.label}
            visibilityError={form.formState.errors.visibility}
          />

          <Field data-invalid={Boolean(form.formState.errors.baseUrl)}>
            <FieldLabel htmlFor="provider-base-url">Base URL</FieldLabel>
            <Input
              id="provider-base-url"
              type="url"
              placeholder={
                provider === 'openai_compatible'
                  ? 'https://api.example.com/v1'
                  : 'https://api.example.com'
              }
              autoComplete="url"
              disabled={createProvider.isPending}
              aria-invalid={Boolean(form.formState.errors.baseUrl)}
              {...form.register('baseUrl')}
            />
            <FieldDescription>
              HTTP and HTTPS endpoints are supported, including local or
              container hostnames.
            </FieldDescription>
            <FieldError errors={[form.formState.errors.baseUrl]} />
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.apiKey)}>
            <FieldLabel htmlFor="provider-api-key">
              API Key <span className="text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Input
              id="provider-api-key"
              type="password"
              autoComplete="off"
              disabled={createProvider.isPending}
              aria-invalid={Boolean(form.formState.errors.apiKey)}
              {...form.register('apiKey')}
            />
            <FieldDescription>
              Leave empty when the upstream does not require authentication.
            </FieldDescription>
            <FieldError errors={[form.formState.errors.apiKey]} />
          </Field>
        </FieldGroup>
      </form>
    </ProviderFormCard>
  )
}

function ProviderBaseFields({
  disabled,
  labelRegistration,
  visibilityRegistration,
  labelError,
  visibilityError,
}: {
  disabled: boolean
  labelRegistration: UseFormRegisterReturn<'label'>
  visibilityRegistration: UseFormRegisterReturn<'visibility'>
  labelError?: ReactHookFormFieldError
  visibilityError?: ReactHookFormFieldError
}) {
  return (
    <>
      <Field data-invalid={Boolean(labelError)}>
        <FieldLabel htmlFor="provider-label">Label</FieldLabel>
        <Input
          id="provider-label"
          autoComplete="off"
          placeholder="My provider"
          disabled={disabled}
          aria-invalid={Boolean(labelError)}
          {...labelRegistration}
        />
        <FieldDescription>
          A recognizable name for this provider account.
        </FieldDescription>
        <FieldError errors={[labelError]} />
      </Field>

      <Field data-invalid={Boolean(visibilityError)}>
        <FieldLabel htmlFor="provider-visibility">Visibility</FieldLabel>
        <NativeSelect
          id="provider-visibility"
          className="w-full"
          disabled={disabled}
          aria-invalid={Boolean(visibilityError)}
          {...visibilityRegistration}
        >
          <NativeSelectOption value="private">Private</NativeSelectOption>
          <NativeSelectOption value="shared">Shared</NativeSelectOption>
        </NativeSelect>
        <FieldDescription>
          Private providers are only available to you. Shared providers can be
          used by other users but remain editable only by their owner.
        </FieldDescription>
        <FieldError errors={[visibilityError]} />
      </Field>
    </>
  )
}

function ProviderFormCard({
  title,
  description,
  error,
  footer,
  children,
}: {
  title: string
  description: string
  error: unknown
  footer: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {error ? <ProviderMutationError error={error} /> : null}
        {children}
      </CardContent>
      <CardFooter className="justify-end">{footer}</CardFooter>
    </Card>
  )
}

function ProviderMutationError({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>Unable to create provider</AlertTitle>
      <AlertDescription>
        {error instanceof ApiError
          ? error.message
          : 'The provider could not be created. Try again.'}
      </AlertDescription>
    </Alert>
  )
}

function useFinishProviderCreation() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return (created: CreatedProviderAccount) => {
    queryClient.setQueryData(
      providerKeys.detail(created.account.id),
      created.account,
    )
    queryClient.setQueryData(
      providerKeys.models(created.account.id),
      created.models.models,
    )
    void queryClient.invalidateQueries({
      queryKey: providerKeys.all,
      exact: true,
    })
    navigate(`/providers/${encodeURIComponent(created.account.id)}`, {
      replace: true,
    })
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
