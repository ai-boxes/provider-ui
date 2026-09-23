import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatUsageDateTime,
  formatUsageEndpoint,
  formatUsageRequestStatus,
} from '@/features/usage/usage-format'
import { UsageLatency } from '@/features/usage/usage-latency'
import { CostBreakdown, TokensBreakdown } from '@/features/usage/usage-breakdowns'
import type {
  UsageRange,
  UsageRequestStatus,
  UsageRequestSummary,
} from '@/features/usage/usage-types'
import { statusBadgeTone, statusFillTone } from '@/lib/status-tone'
import { cn } from '@/lib/utils'

export function UsageRequestsTable({
  items,
  range,
}: {
  items: UsageRequestSummary[]
  range: UsageRange
}) {
  if (items.length === 0) {
    return <UsagePanelEmpty text="No requests match the current filters." />
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">API Key</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Endpoint</TableHead>
            <TableHead>Reasoning effort</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Tokens</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Latency</TableHead>
            <TableHead className="pr-4">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const meta = resolveApiKeyMeta(item)
            return (
              <TableRow key={item.requestId}>
                <TableCell className="max-w-36 truncate pl-4 font-medium">
                  {meta.name}
                </TableCell>
                <TableCell className="max-w-52">
                  <RequestModelCell item={item} />
                </TableCell>
                <TableCell>
                  <UsageStatusBadge status={item.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  <code className="font-mono text-xs">
                    {formatUsageEndpoint(item.endpoint)}
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.reasoningEffort ?? '—'}
                </TableCell>
                <TableCell className="max-w-32 truncate text-muted-foreground">
                  {meta.group}
                </TableCell>
                <TableCell>
                  <TokensBreakdown tokens={item.tokens} />
                </TableCell>
                <TableCell className="tabular-nums">
                  <CostBreakdown
                    requestId={item.requestId}
                    cost={item.cost}
                    range={range}
                  />
                </TableCell>
                <TableCell>
                  <UsageLatency
                    startedAtMs={item.startedAtMs}
                    firstTokenAtMs={item.firstTokenAtMs}
                    completedAtMs={item.completedAtMs}
                  />
                </TableCell>
                <TableCell className="pr-4 whitespace-nowrap text-muted-foreground">
                  {formatUsageDateTime(item.startedAtMs)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function RequestModelCell({ item }: { item: UsageRequestSummary }) {
  const requested = item.clientModel
  const reported = item.providerReportedModel
  if (reported === null) {
    return (
      <span className="block truncate font-mono text-xs">
        {requested ?? '—'}
      </span>
    )
  }

  const matches = requested === reported
  const tone = matches ? 'success' : 'warning'
  return (
    <Collapsible className="min-w-0">
      <CollapsibleTrigger className="flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-md text-left outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
        <span
          className={cn('size-1.5 shrink-0 rounded-full', statusFillTone(tone))}
          aria-hidden="true"
        />
        <span className="min-w-0 truncate font-mono text-xs">
          {requested ?? '—'}
        </span>
        <span className="sr-only">
          {matches
            ? `Matches upstream ${reported}`
            : `Upstream responded with ${reported}`}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="min-w-0 pl-3.5">
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          Upstream: {reported}
        </p>
      </CollapsibleContent>
    </Collapsible>
  )
}

const statusClasses: Record<UsageRequestStatus, string> = {
  succeeded: statusBadgeTone('success'),
  failed: statusBadgeTone('danger'),
  canceled: statusBadgeTone('neutral'),
  incomplete: statusBadgeTone('warning'),
}

function UsageStatusBadge({ status }: { status: UsageRequestStatus }) {
  return (
    <Badge variant="outline" className={statusClasses[status]}>
      {formatUsageRequestStatus(status)}
    </Badge>
  )
}

function UsagePanelEmpty({ text }: { text: string }) {
  return <Card className="p-4 text-sm text-muted-foreground">{text}</Card>
}

function resolveApiKeyMeta(item: UsageRequestSummary): {
  name: string
  group: string
} {
  if (item.apiKeyId === null) {
    return { name: 'No key', group: '—' }
  }

  return {
    name: item.apiKeyLabel ?? '—',
    group: item.apiKeyGroupLabels?.join(', ') ?? '—',
  }
}
