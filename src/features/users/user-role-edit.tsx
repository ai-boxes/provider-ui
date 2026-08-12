import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleAlertIcon, Loader2Icon, ShieldCheckIcon } from 'lucide-react'
import { useState } from 'react'

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
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { AuthUserRole } from '@/features/auth/auth-types'
import { updateUserRole } from '@/features/users/user-api'
import type { ManagedUser } from '@/features/users/user-types'
import { userKeys } from '@/features/users/users-query'
import { apiErrorMessage } from '@/lib/api/error'
import { replaceListItem } from '@/lib/api/query-cache'

export function UserRoleEditDialog({
  user,
  isSelf,
}: {
  user: ManagedUser
  isSelf: boolean
}) {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<AuthUserRole>(user.role)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => updateUserRole({ userId: user.id, role }),
    onSuccess: (updated) => {
      replaceListItem(queryClient, userKeys.all, updated)
      setOpen(false)
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (mutation.isPending) return
    setOpen(nextOpen)
    setRole(user.role)
    mutation.reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" disabled={isSelf} />}
      >
        <ShieldCheckIcon />
        Permission
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {user.username}&apos;s permission</DialogTitle>
          <DialogDescription>
            Super administrators can manage providers and users. Users manage
            only their own API keys and usage.
          </DialogDescription>
        </DialogHeader>
        {mutation.isError ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Unable to update permission</AlertTitle>
            <AlertDescription>
              {apiErrorMessage(
                mutation.error,
                'The permission could not be updated. Try again.',
                {
                  400: 'Select a valid permission and try again.',
                  403: 'You cannot change your own permission.',
                  404: 'The user was not found.',
                  409: 'The last enabled super administrator cannot be changed to a user.',
                },
              )}
            </AlertDescription>
          </Alert>
        ) : null}
        <Field>
          <FieldLabel htmlFor={`user-role-${user.id}`}>Permission</FieldLabel>
          <NativeSelect
            id={`user-role-${user.id}`}
            className="w-full"
            value={role}
            disabled={mutation.isPending}
            onChange={(event) =>
              setRole(event.target.value as AuthUserRole)
            }
          >
            <NativeSelectOption value="user">User</NativeSelectOption>
            <NativeSelectOption value="super_admin">
              Super administrator
            </NativeSelectOption>
          </NativeSelect>
          <FieldDescription>
            Changing permission signs the user out but keeps their API keys
            enabled.
          </FieldDescription>
        </Field>
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" disabled={mutation.isPending} />}
          >
            Cancel
          </DialogClose>
          <Button
            type="button"
            disabled={mutation.isPending || role === user.role}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : null}
            Save permission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
