import { useQuery } from '@tanstack/react-query'
import { CircleAlertIcon, RefreshCwIcon, UsersIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuthState } from '@/features/auth/use-auth-state'
import {
  UserActions,
  UserEnabledControl,
} from '@/features/users/user-actions'
import { UserCreateDialog } from '@/features/users/user-create'
import {
  formatUserDate,
  formatUserRole,
} from '@/features/users/user-format'
import type { ManagedUser } from '@/features/users/user-types'
import { usersQueryOptions } from '@/features/users/users-query'

export function UserList() {
  const authState = useAuthState()
  const users = useQuery(usersQueryOptions)
  const currentUserId =
    authState.status === 'authenticated' ? authState.session.user.id : ''

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid max-w-2xl gap-1">
          <p className="text-sm leading-6 text-muted-foreground">
            Manage the accounts that can sign in to this control plane.
            Provider access continues to follow ownership and visibility rules.
          </p>
          <p className="text-xs text-muted-foreground">
            New users are created as standard users. Super admin remains a
            first-setup role.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          {users.data ? (
            <Badge variant="outline" className="bg-background">
              {formatUserCount(users.data.length)}
            </Badge>
          ) : null}
          <UserCreateDialog />
        </div>
      </div>

      {users.isPending ? <UserListLoading /> : null}
      {users.isError ? (
        <UserListError onRetry={() => void users.refetch()} />
      ) : null}
      {users.data?.length === 0 ? <UserListEmpty /> : null}
      {users.data && users.data.length > 0 ? (
        <UserCollection users={users.data} currentUserId={currentUserId} />
      ) : null}
    </section>
  )
}

function UserCollection({
  users,
  currentUserId,
}: {
  users: ManagedUser[]
  currentUserId: string
}) {
  return (
    <>
      <Card className="hidden gap-0 py-0 lg:flex">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/35 hover:bg-muted/35">
              <TableHead className="pl-4">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <UserTableRow
                key={user.id}
                user={user}
                currentUserId={currentUserId}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 lg:hidden">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </>
  )
}

function UserTableRow({
  user,
  currentUserId,
}: {
  user: ManagedUser
  currentUserId: string
}) {
  return (
    <TableRow>
      <TableCell className="py-4 pl-4">
        <UserIdentity user={user} currentUserId={currentUserId} />
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="bg-background">
          {formatUserRole(user.role)}
        </Badge>
      </TableCell>
      <TableCell>
        <UserEnabledControl user={user} currentUserId={currentUserId} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatUserDate(user.createdAt)}
      </TableCell>
      <TableCell className="pr-4">
        <div className="flex justify-end">
          <UserActions user={user} />
        </div>
      </TableCell>
    </TableRow>
  )
}

function UserCard({
  user,
  currentUserId,
}: {
  user: ManagedUser
  currentUserId: string
}) {
  return (
    <Card className="gap-4 p-4">
      <UserIdentity user={user} currentUserId={currentUserId} />

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-t pt-4 text-sm">
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Role</span>
          <Badge variant="outline" className="w-fit bg-background">
            {formatUserRole(user.role)}
          </Badge>
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Created
          </span>
          <span className="text-muted-foreground">
            {formatUserDate(user.createdAt)}
          </span>
        </div>
        <div className="col-span-2 grid gap-1.5 border-t pt-4">
          <span className="text-xs font-medium text-muted-foreground">
            Status
          </span>
          <UserEnabledControl user={user} currentUserId={currentUserId} />
        </div>
      </div>

      <div className="border-t pt-4">
        <UserActions user={user} />
      </div>
    </Card>
  )
}

function UserIdentity({
  user,
  currentUserId,
}: {
  user: ManagedUser
  currentUserId: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/45 text-muted-foreground shadow-xs">
        <UsersIcon className="size-4" />
      </span>
      <span className="grid min-w-0 gap-1">
        <span className="truncate font-medium">
          {user.username}
          {user.id === currentUserId ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              You
            </span>
          ) : null}
        </span>
        <span className="hidden text-xs text-muted-foreground lg:block">
          Updated {formatUserDate(user.updatedAt)}
        </span>
      </span>
    </div>
  )
}

function UserListLoading() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full lg:hidden" />
    </div>
  )
}

function UserListError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>Unable to load users</AlertTitle>
      <AlertDescription>
        The user list could not be loaded. Check your connection and try again.
      </AlertDescription>
      <Button
        variant="outline"
        size="sm"
        className="mt-3 w-fit group-has-[>svg]/alert:col-start-2"
        onClick={onRetry}
      >
        <RefreshCwIcon />
        Retry
      </Button>
    </Alert>
  )
}

function UserListEmpty() {
  return (
    <Empty className="border border-dashed bg-background/60">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UsersIcon />
        </EmptyMedia>
        <EmptyTitle>No users yet</EmptyTitle>
        <EmptyDescription>
          Create the first standard user account for this control plane.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function formatUserCount(count: number): string {
  return count === 1 ? '1 user' : `${count} users`
}
