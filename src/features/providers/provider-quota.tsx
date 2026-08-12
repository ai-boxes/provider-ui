import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon, RefreshCwIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  getProviderQuota,
  refreshProviderQuota,
} from '@/features/providers/provider-api'
import {
  ProviderQuotaContent,
  ProviderQuotaFreshness,
  ProviderQuotaLoading,
  ProviderQuotaRequestError,
} from '@/features/providers/provider-quota-content'
import {
  clampPercentage,
  findPrimaryUsage,
  formatPercent,
  percentageRemaining,
  percentageUsed,
} from '@/features/providers/provider-quota-metrics'
import {
  syncProviderListQuota,
  syncQuotaCache,
} from '@/features/providers/provider-quota-cache'
import { providerQuotaQueryOptions } from '@/features/providers/providers-query'
import type { ProviderQuota } from '@/features/providers/provider-types'

export function ProviderQuotaSummary({
  accountId,
  quota,
}: {
  accountId: string
  quota: ProviderQuota
}) {
  const queryClient = useQueryClient()
  const checkQuota = useMutation({
    mutationFn: () => getProviderQuota(accountId),
    onSuccess: (nextQuota) => syncQuotaCache(queryClient, accountId, nextQuota),
  })
  const usage = findPrimaryUsage(quota)

  if (quota.support === 'unsupported') {
    return <span className="text-sm text-muted-foreground">Not reported</span>
  }

  if (!quota.snapshot) {
    return (
      <div className="grid justify-items-start gap-1.5">
        <span className="text-sm text-muted-foreground">
          {quota.lastError ? 'Unable to check' : 'Not checked'}
        </span>
        <Button
          variant="ghost"
          size="xs"
          className="-ml-2 h-6 px-2"
          disabled={checkQuota.isPending}
          onClick={() => checkQuota.mutate()}
        >
          {checkQuota.isPending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <RefreshCwIcon />
          )}
          {checkQuota.isPending
            ? 'Checking…'
            : quota.lastError
              ? 'Check again'
              : 'Check quota'}
        </Button>
        {checkQuota.isError ? (
          <span role="alert" className="text-xs text-destructive">
            Request failed
          </span>
        ) : null}
      </div>
    )
  }

  if (!usage) {
    return (
      <div className="grid gap-1">
        <span className="text-sm font-medium">Quota available</span>
        <ProviderQuotaFreshness quota={quota} compact />
      </div>
    )
  }

  const used = percentageUsed(usage.metric)
  const remaining = percentageRemaining(usage.metric)

  return (
    <div className="grid min-w-32 max-w-80 gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium tabular-nums">
          {remaining === null
            ? 'Available'
            : `${formatPercent(remaining)} available`}
        </span>
        {used !== null ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatPercent(used)} used
          </span>
        ) : null}
      </div>
      {used !== null ? (
        <Progress
          value={clampPercentage(used)}
          aria-label={`${formatPercent(used)} used`}
        />
      ) : null}
      <ProviderQuotaFreshness quota={quota} compact />
    </div>
  )
}

export function ProviderQuotaCard({ accountId }: { accountId: string }) {
  const quota = useQuery(providerQuotaQueryOptions(accountId))
  const queryClient = useQueryClient()
  const [refreshAnnouncement, setRefreshAnnouncement] = useState('')
  const refreshQuota = useMutation({
    mutationFn: () => refreshProviderQuota(accountId),
    onMutate: () => setRefreshAnnouncement('Refreshing quota.'),
    onSuccess: (nextQuota) => {
      syncQuotaCache(queryClient, accountId, nextQuota)
      setRefreshAnnouncement(
        nextQuota.lastError
          ? 'The latest refresh failed. The last available quota remains visible.'
          : 'Quota refreshed.',
      )
    },
    onError: () => {
      setRefreshAnnouncement(
        'The refresh request failed. Existing quota data remains visible.',
      )
    },
  })

  useEffect(() => {
    if (quota.data) {
      syncProviderListQuota(queryClient, accountId, quota.data)
    }
  }, [accountId, queryClient, quota.data])

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid gap-1">
            <CardTitle>Quota</CardTitle>
            <CardDescription>Upstream usage and balances.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {quota.data?.snapshot ? (
              <ProviderQuotaFreshness quota={quota.data} />
            ) : null}
            {quota.data?.support === 'supported' ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                disabled={refreshQuota.isPending}
                onClick={() => refreshQuota.mutate()}
              >
                {refreshQuota.isPending ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <RefreshCwIcon />
                )}
                {refreshQuota.isPending ? 'Refreshing…' : 'Refresh quota'}
              </Button>
            ) : null}
          </div>
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {refreshAnnouncement}
        </p>
      </CardHeader>
      <CardContent>
        {quota.isPending ? <ProviderQuotaLoading /> : null}
        {quota.isError ? (
          <ProviderQuotaRequestError onRetry={() => void quota.refetch()} />
        ) : null}
        {quota.data ? <ProviderQuotaContent quota={quota.data} /> : null}
        {refreshQuota.isError ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            The refresh request could not be completed. Existing quota data was
            kept.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
