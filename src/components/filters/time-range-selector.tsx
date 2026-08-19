import { useEffect, useState } from 'react'
import { CalendarClockIcon, CheckIcon, ChevronDownIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  timeRangePresets,
  timeRangeSelectionLabel,
  maxTimeRangeMs,
  timeRangeSelectionKey,
  type TimeRangeSelection,
  type TimeRangePresetId,
  currentTimeRange,
} from '@/features/time-range/time-range'
import { formatUnixMs } from '@/lib/datetime'

export function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRangeSelection
  onChange: (value: TimeRangeSelection) => void
}) {
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const selectionKey = timeRangeSelectionKey(value)
  const valueKind = value.kind
  const valuePreset = value.kind === 'preset' ? value.preset : null
  const valueFromMs = value.kind === 'custom' ? value.fromMs : null
  const valueToMs = value.kind === 'custom' ? value.toMs : null

  useEffect(() => {
    if (open) {
      const range = currentTimeRange(
        valueKind === 'preset'
          ? { kind: 'preset', preset: valuePreset! }
          : { kind: 'custom', fromMs: valueFromMs!, toMs: valueToMs! },
      )
      setDraftFrom(toDateTimeLocal(range.fromMs))
      setDraftTo(toDateTimeLocal(range.toMs))
      setError(null)
    }
  }, [open, selectionKey, valueFromMs, valueKind, valuePreset, valueToMs])

  function selectPreset(preset: TimeRangePresetId) {
    onChange({ kind: 'preset', preset })
    setOpen(false)
  }

  function applyCustomRange() {
    const fromMs = fromDateTimeLocal(draftFrom)
    const toMs = fromDateTimeLocal(draftTo)
    if (fromMs === null || toMs === null || toMs <= fromMs) {
      setError('Choose a valid start and end time.')
      return
    }
    if (toMs - fromMs > maxTimeRangeMs) {
      setError('The range cannot be longer than 90 days.')
      return
    }
    onChange({ kind: 'custom', fromMs, toMs })
    setOpen(false)
  }

  const selectionLabel = timeRangeSelectionLabel(value)
  const customLabel =
    value.kind === 'custom'
      ? `${formatUnixMs(value.fromMs)} – ${formatUnixMs(value.toMs)}`
      : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-w-52 gap-1.5 px-2.5 tabular-nums"
            title={customLabel ?? `Time range: ${selectionLabel}`}
            aria-label={customLabel ?? `Time range: ${selectionLabel}`}
          />
        }
      >
        <CalendarClockIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="truncate">{customLabel ?? selectionLabel}</span>
        <ChevronDownIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <PopoverHeader>
          <PopoverTitle>Time range</PopoverTitle>
        </PopoverHeader>

        <div className="grid gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Quick
          </span>
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
            {timeRangePresets.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant={
                  value.kind === 'preset' && value.preset === preset.id
                    ? 'secondary'
                    : 'ghost'
                }
                className="px-2 text-xs"
                aria-pressed={
                  value.kind === 'preset' && value.preset === preset.id
                }
                onClick={() => selectPreset(preset.id)}
              >
                {value.kind === 'preset' && value.preset === preset.id ? (
                  <CheckIcon aria-hidden="true" />
                ) : null}
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 border-t border-border/70 pt-3">
          <span className="text-xs font-medium text-muted-foreground">
            Custom
          </span>
          <div className="grid gap-1.5">
            <Label htmlFor="time-range-start">Start</Label>
            <Input
              id="time-range-start"
              name="time-range-start"
              type="datetime-local"
              value={draftFrom}
              aria-invalid={error !== null}
              onChange={(event) => setDraftFrom(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="time-range-end">End</Label>
            <Input
              id="time-range-end"
              name="time-range-end"
              type="datetime-local"
              value={draftTo}
              aria-invalid={error !== null}
              onChange={(event) => setDraftTo(event.target.value)}
            />
          </div>
          {error ? (
            <p className="text-xs text-destructive" role="alert" aria-live="polite">
              {error}
            </p>
          ) : null}
          <Button type="button" size="sm" onClick={applyCustomRange}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function toDateTimeLocal(timestamp: number): string {
  const date = new Date(timestamp)
  const offset = date.getTimezoneOffset() * 60 * 1000
  return new Date(timestamp - offset).toISOString().slice(0, 16)
}

function fromDateTimeLocal(value: string): number | null {
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}
