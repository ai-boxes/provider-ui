import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleAlertIcon, Loader2Icon } from 'lucide-react'
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
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { updateUserEnabled } from '@/features/users/user-api'
import { UserEditDialog } from '@/features/users/user-edit'
import { UserDeleteDialog } from '@/features/users/user-delete'
import type { ManagedUser } from '@/features/users/user-types'
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
              Revokes sessions and permanently disables their API keys.
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
      <UserEditDialog user={user} isSelf={user.id === currentUserId} />
      <UserDeleteDialog user={user} isSelf={user.id === currentUserId} />
    </div>
  )
}

const statusMessages = {
  400: 'Check the entered values and try again.',
  403: 'This operation is not allowed.',
  404: 'The user was not found.',
}

function errorMessage(error: unknown, fallback: string): string {
  return apiErrorMessage(error, fallback, statusMessages)
}
