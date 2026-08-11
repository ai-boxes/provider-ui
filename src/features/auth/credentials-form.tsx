import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
import { Spinner } from '@/components/ui/spinner'
import { login, register, setupInitialUser } from '@/features/auth/auth-api'
import type {
  AuthUser,
  RegistrationCredentials,
} from '@/features/auth/auth-types'
import { ApiError } from '@/lib/api/error'

type CredentialsMode = 'login' | 'register' | 'setup'
type CredentialInput = RegistrationCredentials & {
  passwordConfirmation: string
}
type CredentialField = keyof CredentialInput
type CredentialErrors = Partial<Record<CredentialField, string>>

type CredentialsFormProps = {
  mode: CredentialsMode
  onSuccess: (user: AuthUser) => void
  onModeChange?: (mode: 'login' | 'register') => void
  onSetupConflict?: () => void
}

export function CredentialsForm({
  mode,
  onSuccess,
  onModeChange,
  onSetupConflict,
}: CredentialsFormProps) {
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({})
  const mutation = useMutation({
    mutationFn: (credentials: CredentialInput) =>
      submitCredentials(mode, credentials),
    onSuccess,
    onError: (error) => {
      if (mode === 'setup' && isSetupConflict(error)) {
        onSetupConflict?.()
      }
    },
  })
  const content = formContent(mode)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const credentials = {
      username: String(formData.get('username') ?? '').trim(),
      password: String(formData.get('password') ?? ''),
      passwordConfirmation: String(
        formData.get('passwordConfirmation') ?? '',
      ),
      invitationCode: String(formData.get('invitationCode') ?? '').trim(),
    }
    const nextErrors = validateCredentials(credentials, mode)

    setFieldErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    mutation.mutate(credentials)
  }

  function handleFieldChange(field: CredentialField) {
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }))
    }

    if (mutation.isError) {
      mutation.reset()
    }
  }

  const submissionError = mutation.isError
    ? submissionErrorMessage(mutation.error, mode)
    : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle>
            <h1>{content.title}</h1>
          </CardTitle>
          {mode !== 'setup' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              disabled={mutation.isPending}
              onClick={() =>
                onModeChange?.(mode === 'login' ? 'register' : 'login')
              }
            >
              {mode === 'login' ? 'Register' : 'Sign in'}
            </Button>
          ) : null}
        </div>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit}>
          <FieldGroup>
            {submissionError ? (
              <Alert variant="destructive">
                <AlertDescription>{submissionError}</AlertDescription>
              </Alert>
            ) : null}

            <Field data-invalid={Boolean(fieldErrors.username)}>
              <FieldLabel htmlFor={`${mode}-username`}>Username</FieldLabel>
              <Input
                id={`${mode}-username`}
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={128}
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={
                  fieldErrors.username ? `${mode}-username-error` : undefined
                }
                disabled={mutation.isPending}
                autoFocus
                onChange={() => handleFieldChange('username')}
              />
              <FieldError id={`${mode}-username-error`}>
                {fieldErrors.username}
              </FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors.password)}>
              <FieldLabel htmlFor={`${mode}-password`}>Password</FieldLabel>
              <Input
                id={`${mode}-password`}
                name="password"
                type="password"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={passwordDescriptionId(mode, fieldErrors)}
                disabled={mutation.isPending}
                onChange={() => handleFieldChange('password')}
              />
              {mode !== 'login' && !fieldErrors.password ? (
                <FieldDescription id={`${mode}-password-description`}>
                  Use at least 6 characters.
                </FieldDescription>
              ) : null}
              <FieldError id={`${mode}-password-error`}>
                {fieldErrors.password}
              </FieldError>
            </Field>

            {mode === 'setup' ? (
              <Field data-invalid={Boolean(fieldErrors.passwordConfirmation)}>
                <FieldLabel htmlFor="setup-password-confirmation">
                  Confirm password
                </FieldLabel>
                <Input
                  id="setup-password-confirmation"
                  name="passwordConfirmation"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
                  aria-describedby={
                    fieldErrors.passwordConfirmation
                      ? 'setup-password-confirmation-error'
                      : undefined
                  }
                  disabled={mutation.isPending}
                  onChange={() => handleFieldChange('passwordConfirmation')}
                />
                <FieldError id="setup-password-confirmation-error">
                  {fieldErrors.passwordConfirmation}
                </FieldError>
              </Field>
            ) : null}

            {mode === 'register' ? (
              <Field data-invalid={Boolean(fieldErrors.invitationCode)}>
                <FieldLabel htmlFor="register-invitation-code">
                  Invitation code
                </FieldLabel>
                <Input
                  id="register-invitation-code"
                  name="invitationCode"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={Boolean(fieldErrors.invitationCode)}
                  aria-describedby={
                    fieldErrors.invitationCode
                      ? 'register-invitation-code-error'
                      : undefined
                  }
                  disabled={mutation.isPending}
                  onChange={() => handleFieldChange('invitationCode')}
                />
                <FieldError id="register-invitation-code-error">
                  {fieldErrors.invitationCode}
                </FieldError>
              </Field>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Spinner /> : null}
              {mutation.isPending ? content.pendingLabel : content.submitLabel}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

function formContent(mode: CredentialsMode) {
  if (mode === 'setup') {
    return {
      title: 'Create administrator account',
      description:
        'Set up the first super administrator for this provider gateway.',
      submitLabel: 'Create account',
      pendingLabel: 'Creating account',
    }
  }

  if (mode === 'register') {
    return {
      title: 'Create account',
      description: 'Choose a username and password to access the gateway.',
      submitLabel: 'Register',
      pendingLabel: 'Creating account',
    }
  }

  return {
    title: 'Sign in',
    description: 'Enter your credentials to manage the provider gateway.',
    submitLabel: 'Sign in',
    pendingLabel: 'Signing in',
  }
}

function validateCredentials(
  credentials: CredentialInput,
  mode: CredentialsMode,
): CredentialErrors {
  const errors: CredentialErrors = {}

  if (credentials.username.length === 0) {
    errors.username = 'Enter your username.'
  } else if ([...credentials.username].length > 128) {
    errors.username = 'Username must not exceed 128 characters.'
  }

  if (credentials.password.length === 0) {
    errors.password = 'Enter your password.'
  } else if (mode !== 'login' && [...credentials.password].length < 6) {
    errors.password = 'Password must contain at least 6 characters.'
  } else if (new TextEncoder().encode(credentials.password).length > 1024) {
    errors.password = 'Password must not exceed 1024 bytes.'
  }

  if (mode === 'register' && credentials.invitationCode.length === 0) {
    errors.invitationCode = 'Enter your invitation code.'
  }

  if (mode === 'setup') {
    if (credentials.passwordConfirmation.length === 0) {
      errors.passwordConfirmation = 'Confirm your password.'
    } else if (credentials.passwordConfirmation !== credentials.password) {
      errors.passwordConfirmation = 'Passwords do not match.'
    }
  }

  return errors
}

function passwordDescriptionId(
  mode: CredentialsMode,
  errors: CredentialErrors,
): string | undefined {
  if (errors.password) {
    return `${mode}-password-error`
  }

  return mode === 'login' ? undefined : `${mode}-password-description`
}

function isSetupConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409
}

function submissionErrorMessage(
  error: unknown,
  mode: CredentialsMode,
): string {
  if (error instanceof ApiError) {
    if (mode === 'login' && error.status === 401) {
      return 'The username or password is incorrect.'
    }

    if (mode === 'setup' && error.status === 409) {
      return 'Initial setup has already been completed.'
    }

    if (mode === 'register' && error.status === 409) {
      return 'That username is already in use.'
    }

    if (mode === 'register' && error.status === 400) {
      return error.message
    }

    if (error.status === 400) {
      return 'Check the entered values and try again.'
    }

    if (error.status >= 500) {
      return 'The server could not complete the request. Try again.'
    }
  }

  return 'Unable to complete the request. Check your connection and try again.'
}

async function submitCredentials(
  mode: CredentialsMode,
  credentials: CredentialInput,
): Promise<AuthUser> {
  const userCredentials = {
    username: credentials.username,
    password: credentials.password,
  }

  if (mode === 'setup') {
    return setupInitialUser(userCredentials)
  }

  if (mode === 'register') {
    return register(credentials)
  }

  return login(userCredentials)
}
