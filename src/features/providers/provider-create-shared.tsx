import { CircleAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type {
  FieldError as ReactHookFormFieldError,
  UseFormRegisterReturn,
} from 'react-hook-form'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import { ApiError } from '@/lib/api/error'

export function ProviderBaseFields({
  disabled,
  labelRegistration,
  groupLabelRegistration,
  visibilityRegistration,
  priorityRegistration,
  labelError,
  groupLabelError,
  visibilityError,
  priorityError,
}: {
  disabled: boolean
  labelRegistration: UseFormRegisterReturn<'label'>
  groupLabelRegistration: UseFormRegisterReturn<'groupLabel'>
  visibilityRegistration: UseFormRegisterReturn<'visibility'>
  priorityRegistration: UseFormRegisterReturn<'priority'>
  labelError?: ReactHookFormFieldError
  groupLabelError?: ReactHookFormFieldError
  visibilityError?: ReactHookFormFieldError
  priorityError?: ReactHookFormFieldError
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

      <Field data-invalid={Boolean(groupLabelError)}>
        <FieldLabel htmlFor="provider-group-label">Provider group</FieldLabel>
        <Input
          id="provider-group-label"
          autoComplete="off"
          placeholder="shared-codex"
          disabled={disabled}
          aria-invalid={Boolean(groupLabelError)}
          {...groupLabelRegistration}
        />
        <FieldDescription>
          API keys select this label to route through matching provider accounts.
        </FieldDescription>
        <FieldError errors={[groupLabelError]} />
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

      <Field data-invalid={Boolean(priorityError)}>
        <FieldLabel htmlFor="provider-priority">Priority</FieldLabel>
        <Input
          id="provider-priority"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          aria-invalid={Boolean(priorityError)}
          {...priorityRegistration}
        />
        <FieldDescription>
          Lower numbers are preferred within the same Provider group.
        </FieldDescription>
        <FieldError errors={[priorityError]} />
      </Field>
    </>
  )
}
export function ProviderFormCard({
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
