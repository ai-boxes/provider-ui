import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { CircleAlertIcon, Loader2Icon, PencilIcon } from 'lucide-react'
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { clearAuthSession } from '@/features/auth/auth-session'
import {
  resetUserPassword,
  updateUserRole,
} from '@/features/users/user-api'
import type { ManagedUser } from '@/features/users/user-types'
import { userKeys } from '@/features/users/users-query'
import { apiErrorMessage } from '@/lib/api/error'
import { replaceListItem } from '@/lib/api/query-cache'

export function UserEditDialog({
  user,
  isSelf,
}: {
  user: ManagedUser
  isSelf: boolean
}) {
  const [open, setOpen] = useState(false)
  const [requestError, setRequestError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)
  const [savedRole, setSavedRole] = useState(user.role)
  const queryClient = useQueryClient()
  const form = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: valuesFor(user),
  })
  const role = form.watch('role')
  const password = form.watch('password')
  const hasChanges = (!isSelf && role !== savedRole) || password.length > 0

  function handleOpenChange(nextOpen: boolean) {
    if (submitting) return

    setOpen(nextOpen)
    form.reset(valuesFor(user))
    setSavedRole(user.role)
    setRequestError(null)
  }

  async function submit(values: EditUserValues) {
    const roleChanged = !isSelf && values.role !== savedRole
    const passwordChanged = values.password.length > 0
    if (!roleChanged && !passwordChanged) return

    setSubmitting(true)
    setRequestError(null)

    try {
      if (roleChanged) {
        const updated = await updateUserRole({
          userId: user.id,
          role: values.role,
        })
        replaceListItem(queryClient, userKeys.all, updated)
        setSavedRole(updated.role)
      }

      if (passwordChanged) {
        const updated = await resetUserPassword({
          userId: user.id,
          password: values.password,
        })
        replaceListItem(queryClient, userKeys.all, updated)
        form.setValue('password', '')
      }

      form.reset(valuesFor({ ...user, role: values.role }))
      setOpen(false)
      if (isSelf && passwordChanged) clearAuthSession()
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
              ? 'Set a new password. This immediately revokes your existing sessions and signs you out.'
              : 'Update the user’s permission or set a new password. Either change immediately revokes existing sessions.'}
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
            <Field>
              <FieldLabel htmlFor={`user-edit-role-${user.id}`}>
                Permission
              </FieldLabel>
              <NativeSelect
                id={`user-edit-role-${user.id}`}
                className="w-full"
                disabled={submitting || isSelf}
                {...form.register('role')}
              >
                <NativeSelectOption value="user">User</NativeSelectOption>
                <NativeSelectOption value="super_admin">
                  Super administrator
                </NativeSelectOption>
              </NativeSelect>
              <FieldDescription>
                {isSelf
                  ? 'You cannot change your own permission.'
                  : 'Super administrators can manage providers and users. Users manage only their own API keys and usage.'}
              </FieldDescription>
            </Field>

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
              <FieldDescription>
                Leave blank to keep the current password. New passwords must
                contain at least 6 characters.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.password]} />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" disabled={submitting} />}
          >
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form={`user-edit-${user.id}`}
            disabled={submitting || !hasChanges}
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
    role: z.enum(['user', 'super_admin']),
    password: z.string(),
  })
  .superRefine((values, context) => {
    if (values.password && [...values.password].length < 6) {
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

function valuesFor(user: ManagedUser): EditUserValues {
  return {
    role: user.role,
    password: '',
  }
}

const statusMessages = {
  400: 'Check the entered values and try again.',
  403: 'This operation is not allowed.',
  404: 'The user was not found.',
  409: 'The last enabled super administrator cannot be changed to a user.',
}

function errorMessage(error: unknown, fallback: string): string {
  return apiErrorMessage(error, fallback, statusMessages)
}
