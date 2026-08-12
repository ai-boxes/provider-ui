import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
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
import { createCompatibleProvider } from '@/features/providers/provider-api'
import {
  ProviderBaseFields,
  ProviderFormCard,
} from '@/features/providers/provider-create-shared'
import {
  compatibleProviderSchema,
  defaultBaseValues,
  type CompatibleProviderValues,
} from '@/features/providers/provider-create-schema'
import type { CompatibleProviderKind } from '@/features/providers/provider-types'
import { useFinishProviderCreation } from '@/features/providers/use-finish-provider-creation'

export function CompatibleProviderForm({
  provider,
}: {
  provider: CompatibleProviderKind
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
      description="Compatible provider settings."
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
            groupLabel: values.groupLabel,
            visibility: values.visibility,
            priority: values.priority,
            baseUrl: values.baseUrl,
            apiKey: values.apiKey,
          })
        })}
      >
        <FieldGroup>
          <ProviderBaseFields
            disabled={createProvider.isPending}
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
            <FieldDescription>HTTP and HTTPS are supported.</FieldDescription>
            <FieldError errors={[form.formState.errors.baseUrl]} />
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.apiKey)}>
            <FieldLabel htmlFor="provider-api-key">API Key</FieldLabel>
            <Input
              id="provider-api-key"
              type="password"
              autoComplete="off"
              disabled={createProvider.isPending}
              aria-invalid={Boolean(form.formState.errors.apiKey)}
              {...form.register('apiKey')}
            />
            <FieldError errors={[form.formState.errors.apiKey]} />
          </Field>
        </FieldGroup>
      </form>
    </ProviderFormCard>
  )
}
