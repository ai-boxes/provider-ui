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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { clearAuthSession } from '@/features/auth/auth-session'
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
import { UserRoleEditDialog } from '@/features/users/user-role-edit'
import { userKeys } from '@/features/users/users-query'
import { apiErrorMessage } from '@/lib/api/error'
import { replaceListItem } from '@/lib/api/query-cache'

export function UserEnabledControl({
  user,
  currentUserId,
}: {
  user: ManagedUser
  currentUserId: string
}) {
  const [disableOpen, setDisableOpen] = useState(false)
  const queryClient = useQueryClient()
  const isSelf = user.id === currentUserId
  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      updateUserEnabled({ userId: user.id, enabled }),
    onSuccess: (updated) => {
      replaceListItem(queryClient, userKeys.all, updated)
      setDisableOpen(false)
    },
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
      onCheckedChange={(enabled) => {
        mutation.reset()
        if (enabled) {
          mutation.mutate(true)
        } else {
          setDisableOpen(true)
        }
      }}
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
      <AlertDialog
        open={disableOpen}
        onOpenChange={(nextOpen) => {
          if (!mutation.isPending) {
            setDisableOpen(nextOpen)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <CircleAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Disable {user.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              This immediately revokes the user&apos;s sessions and permanently
              disables all of their API keys. Re-enabling the account does not
              re-enable those keys.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {mutation.isError ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Unable to disable user</AlertTitle>
              <AlertDescription>
                {errorMessage(mutation.error, 'Unable to update user status.')}
              </AlertDescription>
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>
              Keep enabled
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(false)}
            >
              {mutation.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              Disable user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function UserActions({
  user,
  currentUserId,
}: {
  user: ManagedUser
  currentUserId: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <UserRoleEditDialog user={user} isSelf={user.id === currentUserId} />
      <UserEditDialog user={user} isSelf={user.id === currentUserId} />
    </div>
  )
}

function UserEditDialog({
  user,
  isSelf,
}: {
  user: ManagedUser
  isSelf: boolean
}) {
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
      replaceListItem(queryClient, userKeys.all, updated)
      form.reset(defaultValues)
      setOpen(false)
      if (isSelf) {
        clearAuthSession()
      }
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
            {isSelf
              ? 'Changing your password revokes existing sessions. You will be signed out immediately and can sign in with the new password.'
              : 'Changing this password immediately revokes the user’s existing sessions.'}
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
          <DialogClose
            disabled={submitting}
            render={<Button variant="outline" disabled={submitting} />}
          >
            Cancel
          </DialogClose>
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

const statusMessages = {
  400: 'Check the entered values and try again.',
  403: 'This operation is not allowed.',
  404: 'The user was not found.',
}

function errorMessage(error: unknown, fallback: string): string {
  return apiErrorMessage(error, fallback, statusMessages)
}
