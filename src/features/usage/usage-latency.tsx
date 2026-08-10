import {
  elapsedLatencyMs,
  formatUsageLatencyMs,
  totalLatencyMs,
} from '@/features/usage/usage-latency-format'

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
    <div className="flex w-fit items-stretch gap-2">
      <LatencyVerticalBar ms={totalMs} />
      <dl className="grid grid-cols-[auto_auto] gap-x-2 gap-y-0.5 text-xs leading-4 tabular-nums">
        <dt className="text-muted-foreground">
          <abbr className="no-underline" title="Time to first token">
            TTFT
          </abbr>
        </dt>
        <dd className="text-right font-medium text-foreground">
          {formatUsageLatencyMs(firstTokenMs)}
        </dd>
        <dt className="text-muted-foreground">Total</dt>
        <dd className="text-right font-medium text-foreground">
          {formatUsageLatencyMs(totalMs)}
        </dd>
      </dl>
    </div>
  )
}

// Green indicates a fast total request, progressing toward amber over 10s.
const LATENCY_BAR_FULL_MS = 10_000

function LatencyVerticalBar({ ms }: { ms: number }) {
  const ratio = Math.max(0, Math.min(1, ms / LATENCY_BAR_FULL_MS))

  return (
    <div
      aria-hidden
      title={`Total ${formatUsageLatencyMs(ms)}`}
      className="w-1.5 shrink-0 self-stretch rounded-full"
      style={{ backgroundColor: latencyTone(ratio) }}
    />
  )
}

function latencyTone(ratio: number): string {
  const hue = 145 - ratio * 70
  const chroma = 0.14 + ratio * 0.04
  const lightness = 0.72 + ratio * 0.06
  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(1)})`
}
