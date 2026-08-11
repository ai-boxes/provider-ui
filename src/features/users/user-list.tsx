import { useQuery } from '@tanstack/react-query'
import { CircleAlertIcon, RefreshCwIcon, UsersIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PageHeader } from '@/components/layout/page-header'
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
import { RegistrationCodeCreateDialog } from '@/features/users/registration-code-create'
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
    authState.status === 'authenticated' ? authState.user.id : ''
  const content = users.isPending ? (
    <UserListLoading />
  ) : users.isError ? (
    <UserListError
      busy={users.isFetching}
      onRetry={() => void users.refetch()}
    />
  ) : users.data.length === 0 ? (
    <UserListEmpty />
  ) : (
    <UserCollection users={users.data} currentUserId={currentUserId} />
  )

  return (
    <section className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="Users"
        description="Manage who can sign in. Provider configuration remains restricted to super administrators."
        actions={
          <div className="flex flex-wrap gap-2">
            <RegistrationCodeCreateDialog />
            <UserCreateDialog />
          </div>
        }
      />

      {content}
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
            <TableRow className="bg-muted/55 hover:bg-muted/55">
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
          <UserActions user={user} currentUserId={currentUserId} />
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
        <UserActions user={user} currentUserId={currentUserId} />
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
    <>
      <Card className="hidden gap-0 py-0 lg:flex">
        <div className="grid grid-cols-[2fr_1fr_1fr_0.8fr_1.4fr] gap-4 border-b bg-muted/35 px-4 py-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[2fr_1fr_1fr_0.8fr_1.4fr] items-center gap-4 border-b px-4 py-4 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-9" />
              <div className="grid gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-20" />
            <div className="flex justify-end">
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </Card>

      <div className="grid gap-3 lg:hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} className="gap-4 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9" />
              <div className="grid gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              {Array.from({ length: 3 }, (_, fieldIndex) => (
                <div key={fieldIndex} className="grid gap-2">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

function UserListError({
  busy,
  onRetry,
}: {
  busy: boolean
  onRetry: () => void
}) {
  return (
    <Alert className="max-w-2xl">
      <CircleAlertIcon />
      <AlertTitle>Unable to load users</AlertTitle>
      <AlertDescription>
        Check the server connection and try again.
      </AlertDescription>
      <Button
        variant="outline"
        size="sm"
        className="mt-3 w-fit group-has-[>svg]/alert:col-start-2"
        disabled={busy}
        onClick={onRetry}
      >
        <RefreshCwIcon className={busy ? 'animate-spin' : undefined} />
        {busy ? 'Retrying…' : 'Retry'}
      </Button>
    </Alert>
  )
}

function UserListEmpty() {
  return (
    <Card className="min-h-80 justify-center">
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-10 rounded-xl">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>No users yet</EmptyTitle>
          <EmptyDescription>
            Create the first standard user account for this control plane.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Card>
  )
}
