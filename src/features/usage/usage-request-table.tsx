import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatUsageDateTime } from '@/features/usage/usage-format'
import { UsageLatency } from '@/features/usage/usage-latency'
import { CostBreakdown, TokensBreakdown } from '@/features/usage/usage-breakdowns'
import type { UsageRange, UsageRequestSummary } from '@/features/usage/usage-types'

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
                <TableCell className="max-w-44 truncate font-mono text-xs">
                  {item.clientModel ?? '—'}
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
    group: item.apiKeyGroupLabel ?? '—',
  }
}
