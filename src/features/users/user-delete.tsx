import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleAlertIcon, Loader2Icon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'

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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deleteUser } from '@/features/users/user-api'
import type { ManagedUser } from '@/features/users/user-types'
import { userKeys } from '@/features/users/users-query'
import { apiErrorMessage } from '@/lib/api/error'

export function UserDeleteDialog({
  user,
  isSelf,
}: {
  user: ManagedUser
  isSelf: boolean
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => deleteUser(user.id),
    onSuccess: () => {
      queryClient.setQueryData<ManagedUser[]>(userKeys.all, (users) =>
        users?.filter((item) => item.id !== user.id),
      )
      setOpen(false)
    },
  })

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!mutation.isPending) {
          setOpen(nextOpen)
          mutation.reset()
        }
      }}
    >
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={isSelf}
            aria-label={isSelf ? 'You cannot delete your own account' : undefined}
          />
        }
      >
        <Trash2Icon />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <CircleAlertIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {user.username}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the user, their sessions, and all of their
            API keys. Users that own providers must have those providers
            deleted first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {mutation.isError ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Unable to delete user</AlertTitle>
            <AlertDescription>
              {apiErrorMessage(
                mutation.error,
                'The user could not be deleted. Try again.',
                {
                  403: 'You cannot delete your own account.',
                  404: 'The user was not found.',
                },
              )}
            </AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : null}
            Delete user
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
