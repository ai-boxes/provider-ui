import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ProviderHealthAccount } from '@/features/providers/provider-types'

export function ProviderHealthCard({
  health,
}: {
  health?: ProviderHealthAccount | null
}) {
  if (health === undefined) {
    return (
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Health</CardTitle>
          <CardDescription>Requests in the last 24 hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading health data…</p>
        </CardContent>
      </Card>
    )
  }

  if (health === null) {
    return (
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Health</CardTitle>
          <CardDescription>Requests in the last 24 hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Health data is unavailable.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { requests, successes, failures } = health
  const successShare = percentage(successes, requests)
  const failureShare = percentage(failures, requests)
  const successRate = requests > 0 ? `${formatPercent(successShare)}%` : '—'

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Health</CardTitle>
        <CardDescription>Requests in the last 24 hours.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div
          className="flex h-4 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Provider health"
          aria-valuemin={0}
          aria-valuemax={Math.max(requests, 1)}
          aria-valuenow={successes}
          aria-valuetext={`${formatCount(successes)} successful, ${formatCount(failures)} failed`}
          aria-busy={health === undefined}
        >
          {successShare > 0 ? (
            <div
              className="h-full bg-emerald-500 transition-[width]"
              style={{ width: `${successShare}%` }}
            />
          ) : null}
          {failureShare > 0 ? (
            <div
              className="h-full bg-red-500 transition-[width]"
              style={{ width: `${failureShare}%` }}
            />
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Success rate
            </span>
            <span className="text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {successRate}
            </span>
          </div>
          <div className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Successful
            </span>
            <span className="text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatCount(successes)}
            </span>
          </div>
          <div className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Failed
            </span>
            <span className="text-xl font-semibold tabular-nums text-red-700 dark:text-red-300">
              {formatCount(failures)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function percentage(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 1,
  }).format(value)
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en').format(value)
}
