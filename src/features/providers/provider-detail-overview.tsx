import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleOffIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  Share2Icon,
  UserRoundIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ProviderEnabledControl } from '@/features/providers/provider-account-management'
import { formatProviderKind } from '@/features/providers/provider-format'
import type {
  ProviderAccount,
  ProviderCredentialKind,
} from '@/features/providers/provider-types'
import { formatUnixSeconds } from '@/lib/datetime'
import { cn } from '@/lib/utils'

export function ProviderOverview({
  account,
  ownedByCurrentUser,
}: {
  account: ProviderAccount
  ownedByCurrentUser: boolean
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Overview</CardTitle>
        <CardDescription>Connection and access settings.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <DetailField label="Provider">
          {formatProviderKind(account.provider)}
        </DetailField>
        <DetailField label="Access">
          <span className="flex items-center gap-1.5">
            {account.visibility === 'shared' ? (
              <Share2Icon className="size-3.5 text-muted-foreground" />
            ) : (
              <LockKeyholeIcon className="size-3.5 text-muted-foreground" />
            )}
            {account.visibility === 'shared' ? 'Shared' : 'Private'}
          </span>
        </DetailField>
        <DetailField label="Ownership">
          <span className="flex items-center gap-1.5">
            <UserRoundIcon className="size-3.5 text-muted-foreground" />
            {ownedByCurrentUser ? 'Owned by you' : 'Shared with you'}
          </span>
        </DetailField>
        <DetailField label="Credential">
          <span className="flex items-center gap-1.5">
            <KeyRoundIcon className="size-3.5 text-muted-foreground" />
            {formatCredentialKind(account.credentialKind)}
          </span>
        </DetailField>
        <DetailField label="Priority">
          <span className="tabular-nums">{account.priority}</span>
        </DetailField>
        <DetailField label="Enabled">
          {ownedByCurrentUser ? (
            <ProviderEnabledControl account={account} />
          ) : account.enabled ? (
            'Yes'
          ) : (
            'No'
          )}
        </DetailField>
        <DetailField label="Authentication">
          {account.authState === 'active' ? 'Active' : 'Reauthentication required'}
        </DetailField>
        {account.baseUrl ? (
          <DetailField label="Base URL" className="sm:col-span-2">
            <span className="break-all font-mono text-xs">
              {account.baseUrl}
            </span>
          </DetailField>
        ) : null}
        <DetailField label="Created">
          {formatTimestamp(account.createdAt)}
        </DetailField>
        <DetailField label="Updated">
          {formatTimestamp(account.updatedAt)}
        </DetailField>
        {account.safeErrorCode ? (
          <DetailField label="Error code">
            <code className="font-mono text-xs">{account.safeErrorCode}</code>
          </DetailField>
        ) : null}
      </CardContent>
    </Card>
  )
}
function DetailField({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

export function AccountStatusBadge({ account }: { account: ProviderAccount }) {
  if (account.authState === 'reauth_required') {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
      >
        <CircleAlertIcon />
        Reauthentication required
      </Badge>
    )
  }

  if (account.enabled) {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        <CircleCheckIcon />
        Activated
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <CircleOffIcon />
      Disabled
    </Badge>
  )
}

function formatCredentialKind(kind: ProviderCredentialKind): string {
  const labels: Record<ProviderCredentialKind, string> = {
    oauth: 'OAuth',
    api_key: 'API key',
  }

  return labels[kind]
}

function formatTimestamp(timestamp: number): string {
  return formatUnixSeconds(timestamp)
}
