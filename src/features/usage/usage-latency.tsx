import {
  elapsedLatencyMs,
  formatUsageLatencyMs,
  totalLatencyMs,
} from '@/features/usage/usage-latency-format'
import {
  latencyIndicator,
  type LatencyMetric,
} from '@/features/usage/usage-latency-scale'

type UsageLatencyProps = {
  startedAtMs: number
  firstTokenAtMs: number | null
  completedAtMs: number
}

export function UsageLatency({
  startedAtMs,
  firstTokenAtMs,
  completedAtMs,
}: UsageLatencyProps) {
  const firstTokenMs = elapsedLatencyMs(startedAtMs, firstTokenAtMs)
  const totalMs = totalLatencyMs(startedAtMs, completedAtMs)

  return (
    <dl className="grid w-fit grid-cols-[auto_4rem_auto] items-center gap-x-2 gap-y-1 text-xs leading-4 tabular-nums">
      <LatencyRow label="TTFT" metric="ttft" ms={firstTokenMs} />
      <LatencyRow label="Total" metric="total" ms={totalMs} />
    </dl>
  )
}

function LatencyRow({
  label,
  metric,
  ms,
}: {
  label: 'TTFT' | 'Total'
  metric: LatencyMetric
  ms: number | null
}) {
  const indicator = latencyIndicator(ms, metric)

  return (
    <>
      <dt className="text-muted-foreground">
        {label === 'TTFT' ? (
          <abbr className="no-underline" title="Time to first token">
            {label}
          </abbr>
        ) : (
          label
        )}
      </dt>
      <dd
        aria-hidden
        className="h-1.5 overflow-hidden rounded-full bg-muted shadow-inner"
      >
        {indicator ? (
          <span
            className="block h-full min-w-0.5 rounded-full"
            style={{
              backgroundColor: indicator.color,
              width: `${indicator.progressPercent}%`,
            }}
          />
        ) : null}
      </dd>
      <dd className="text-right font-medium text-foreground">
        {formatUsageLatencyMs(ms)}
      </dd>
    </>
  )
}
