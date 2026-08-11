import {
  elapsedLatencyMs,
  formatUsageLatencyMs,
  totalLatencyMs,
} from '@/features/usage/usage-latency-format'
import { latencyIndicator } from '@/features/usage/usage-latency-scale'

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
  const firstTokenIndicator = latencyIndicator(firstTokenMs, 'ttft')
  const totalIndicator = latencyIndicator(totalMs, 'total')

  return (
    <div className="flex w-fit items-stretch gap-2">
      <div
        aria-hidden
        className="grid w-1 shrink-0 grid-rows-2 gap-0.5 py-0.5"
      >
        <LatencySegment color={firstTokenIndicator?.color} />
        <LatencySegment color={totalIndicator?.color} />
      </div>
      <dl className="grid grid-cols-[auto_auto] gap-x-2 gap-y-0.5 text-xs leading-4 tabular-nums">
        <LatencyRow label="TTFT" ms={firstTokenMs} />
        <LatencyRow label="Total" ms={totalMs} />
      </dl>
    </div>
  )
}

function LatencySegment({ color }: { color: string | undefined }) {
  return (
    <span
      className="block min-h-3 rounded-full bg-muted"
      style={color ? { backgroundColor: color } : undefined}
    />
  )
}

function LatencyRow({
  label,
  ms,
}: {
  label: 'TTFT' | 'Total'
  ms: number | null
}) {
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
      <dd className="text-right font-medium text-foreground">
        {formatUsageLatencyMs(ms)}
      </dd>
    </>
  )
}
