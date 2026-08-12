import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { startProviderOAuth } from '@/features/providers/provider-api'
import {
  ProviderBaseFields,
  ProviderFormCard,
} from '@/features/providers/provider-create-shared'
import {
  defaultBaseValues,
  providerBaseSchema,
  type ProviderBaseValues,
} from '@/features/providers/provider-create-schema'
import type { OAuthProviderKind } from '@/features/providers/provider-types'

export function ProviderOAuthStartForm({
  provider,
}: {
  provider: OAuthProviderKind
}) {
  const [, setSearchParams] = useSearchParams()
  const form = useForm<ProviderBaseValues>({
    resolver: zodResolver(providerBaseSchema),
    defaultValues: defaultBaseValues,
  })
  const startOAuth = useMutation({
    mutationFn: startProviderOAuth,
    onSuccess: (session) => {
      setSearchParams(
        { provider, oauth_session: session.id },
        { replace: true },
      )
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
          form="provider-oauth-form"
          disabled={startOAuth.isPending}
        >
          {startOAuth.isPending ? <Loader2Icon className="animate-spin" /> : null}
          Start authorization
        </Button>
      }
    >
      <form
        id="provider-oauth-form"
        onSubmit={form.handleSubmit((values) =>
          startOAuth.mutate({ ...values, provider }),
        )}
      >
        <FieldGroup>
          <ProviderBaseFields
            disabled={startOAuth.isPending}
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
        </FieldGroup>
      </form>
    </ProviderFormCard>
  )
}
