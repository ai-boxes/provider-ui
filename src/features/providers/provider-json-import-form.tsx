import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2Icon, UploadIcon } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { importOAuthProvider } from '@/features/providers/provider-api'
import {
  ProviderBaseFields,
  ProviderFormCard,
} from '@/features/providers/provider-create-shared'
import {
  credentialJsonImportSchema,
  defaultBaseValues,
  type CredentialJsonImportValues,
} from '@/features/providers/provider-create-schema'
import type { OAuthProviderKind } from '@/features/providers/provider-types'
import { useFinishProviderCreation } from '@/features/providers/use-finish-provider-creation'

export function ProviderJsonImportForm({
  provider,
}: {
  provider: OAuthProviderKind
}) {
  const finishCreation = useFinishProviderCreation()
  const [fileError, setFileError] = useState<string | null>(null)
  const form = useForm<CredentialJsonImportValues>({
    resolver: zodResolver(credentialJsonImportSchema),
    defaultValues: {
      ...defaultBaseValues,
      credentialJson: '',
    },
  })
  const importProvider = useMutation({
    mutationFn: importOAuthProvider,
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
          form="provider-json-form"
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
        id="provider-json-form"
        onSubmit={form.handleSubmit((values) => {
          importProvider.mutate({
            provider,
            label: values.label,
            groupLabel: values.groupLabel,
            visibility: values.visibility,
            priority: values.priority,
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
            groupLabelRegistration={form.register('groupLabel')}
            visibilityRegistration={form.register('visibility')}
            priorityRegistration={form.register('priority', {
              valueAsNumber: true,
            })}
            labelError={form.formState.errors.label}
            groupLabelError={form.formState.errors.groupLabel}
            visibilityError={form.formState.errors.visibility}
            priorityError={form.formState.errors.priority}
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
              placeholder={
                provider === 'grok'
                  ? '{\n  "type": "xai",\n  ...\n}'
                  : '{\n  "type": "codex",\n  "auth_kind": "oauth",\n  ...\n}'
              }
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
