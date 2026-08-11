import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  Loader2Icon,
  PlusIcon,
  UserPlusIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { createUser } from '@/features/users/user-api'
import { userKeys } from '@/features/users/users-query'
import { apiErrorMessage } from '@/lib/api/error'

const createUserSchema = z
  .object({
    username: z.string().trim().min(1, 'Username is required.'),
    password: z.string(),
  })
  .superRefine((values, context) => {
    if (new TextEncoder().encode(values.username).length > 128) {
      context.addIssue({
        code: 'custom',
        path: ['username'],
        message: 'Username must be 128 bytes or fewer.',
      })
    }

    if ([...values.password].length < 6) {
      context.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Password must contain at least 6 characters.',
      })
    }

    if (new TextEncoder().encode(values.password).length > 1024) {
      context.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Password must not exceed 1024 bytes.',
      })
    }
  })

type CreateUserValues = z.infer<typeof createUserSchema>

const defaultValues: CreateUserValues = {
  username: '',
  password: '',
}

export function UserCreateDialog() {
  const [open, setOpen] = useState(false)
  const [requestError, setRequestError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues,
  })

  function handleOpenChange(nextOpen: boolean) {
    if (submitting) {
      return
    }

    setOpen(nextOpen)
    form.reset(defaultValues)
    setRequestError(null)
  }

  async function submit(values: CreateUserValues) {
    setSubmitting(true)
    setRequestError(null)

    try {
      await createUser({
        username: values.username,
        password: values.password,
      })
      form.reset(defaultValues)
      setOpen(false)
      void queryClient.invalidateQueries({
        queryKey: userKeys.all,
        exact: true,
      })
    } catch (error) {
      setRequestError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        Create user
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            Create a standard user account that can sign in to this control plane.
          </DialogDescription>
        </DialogHeader>

        {requestError ? <CreateError error={requestError} /> : null}

        <form
          id="user-create-form"
          onSubmit={form.handleSubmit((values) => void submit(values))}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.username)}>
              <FieldLabel htmlFor="user-username">Username</FieldLabel>
              <Input
                id="user-username"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="member"
                disabled={submitting}
                aria-invalid={Boolean(form.formState.errors.username)}
                {...form.register('username')}
              />
              <FieldDescription>Use at least 1 character.</FieldDescription>
              <FieldError errors={[form.formState.errors.username]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.password)}>
              <FieldLabel htmlFor="user-password">Password</FieldLabel>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                disabled={submitting}
                aria-invalid={Boolean(form.formState.errors.password)}
                {...form.register('password')}
              />
              <FieldDescription>Use at least 6 characters.</FieldDescription>
              <FieldError errors={[form.formState.errors.password]} />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose
            disabled={submitting}
            render={<Button variant="outline" disabled={submitting} />}
          >
            Cancel
          </DialogClose>
          <Button type="submit" form="user-create-form" disabled={submitting}>
            {submitting ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <UserPlusIcon />
            )}
            Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateError({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>Unable to create user</AlertTitle>
      <AlertDescription>
        {errorMessage(error, 'The user could not be created. Try again.')}
      </AlertDescription>
    </Alert>
  )
}

function errorMessage(error: unknown, fallback: string): string {
  return apiErrorMessage(error, fallback, {
    400: 'Check the entered values and try again.',
    409: 'A user with this username already exists.',
  })
}
