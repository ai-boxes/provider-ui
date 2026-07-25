import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  Loader2Icon,
  PencilIcon,
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
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  resetUserPassword,
  updateUserEnabled,
} from '@/features/users/user-api'
import type { ManagedUser } from '@/features/users/user-types'
import { userKeys } from '@/features/users/users-query'
import { ApiError } from '@/lib/api/error'

export function UserEnabledControl({
  user,
  currentUserId,
}: {
  user: ManagedUser
  currentUserId: string
}) {
  const queryClient = useQueryClient()
  const isSelf = user.id === currentUserId
  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      updateUserEnabled({ userId: user.id, enabled }),
    onSuccess: (updated) => updateListItem(queryClient, updated),
  })

  const switchControl = (
    <Switch
      size="sm"
      checked={user.enabled}
      disabled={mutation.isPending || isSelf}
      aria-label={
        isSelf
          ? 'You cannot disable your own account'
          : user.enabled
            ? 'Disable user'
            : 'Enable user'
      }
      onCheckedChange={(enabled) => mutation.mutate(enabled)}
    />
  )

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        {isSelf ? (
          <Tooltip>
            <TooltipTrigger
              render={<span className="inline-flex cursor-not-allowed" />}
            >
              {switchControl}
            </TooltipTrigger>
            <TooltipContent>
              You cannot disable your own account
            </TooltipContent>
          </Tooltip>
        ) : (
          switchControl
        )}
        {mutation.isPending ? (
          <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {mutation.isError ? (
        <span role="alert" className="text-xs text-destructive">
          {errorMessage(mutation.error, 'Unable to update user status.')}
        </span>
      ) : null}
    </div>
  )
}

export function UserActions({ user }: { user: ManagedUser }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <UserEditDialog user={user} />
    </div>
  )
}

function UserEditDialog({ user }: { user: ManagedUser }) {
  const [open, setOpen] = useState(false)
  const [requestError, setRequestError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
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

  async function submit(values: EditUserValues) {
    setSubmitting(true)
    setRequestError(null)

    try {
      const updated = await resetUserPassword({
        userId: user.id,
        password: values.password,
      })
      updateListItem(queryClient, updated)
      form.reset(defaultValues)
      setOpen(false)
    } catch (error) {
      setRequestError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {user.username}</DialogTitle>
          <DialogDescription>
            Update this account. Password is the only editable field for now.
            Changing it immediately revokes existing sessions.
          </DialogDescription>
        </DialogHeader>

        {requestError ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Unable to update user</AlertTitle>
            <AlertDescription>
              {errorMessage(
                requestError,
                'The user could not be updated. Try again.',
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        <form
          id={`user-edit-${user.id}`}
          onSubmit={form.handleSubmit((values) => void submit(values))}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.password)}>
              <FieldLabel htmlFor={`user-edit-password-${user.id}`}>
                New password
              </FieldLabel>
              <Input
                id={`user-edit-password-${user.id}`}
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
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            type="submit"
            form={`user-edit-${user.id}`}
            disabled={submitting}
          >
            {submitting ? <Loader2Icon className="animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const editUserSchema = z
  .object({
    password: z.string(),
  })
  .superRefine((values, context) => {
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

type EditUserValues = z.infer<typeof editUserSchema>

const defaultValues: EditUserValues = {
  password: '',
}

function updateListItem(
  queryClient: ReturnType<typeof useQueryClient>,
  updated: ManagedUser,
) {
  queryClient.setQueryData<ManagedUser[]>(userKeys.all, (current) => {
    if (!current) {
      return current
    }

    return current.map((user) => (user.id === updated.id ? updated : user))
  })
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return 'This operation is not allowed.'
    }

    if (error.status === 404) {
      return 'The user was not found.'
    }

    if (error.status === 400) {
      return 'Check the entered values and try again.'
    }

    return error.message
  }

  return fallback
}
