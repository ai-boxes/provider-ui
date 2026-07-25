import { CalendarIcon, Clock3Icon, XIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const dateTimeFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function ApiKeyExpirationField({
  id,
  value,
  onChange,
  disabled = false,
  invalid = false,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  invalid?: boolean
}) {
  const selected = parseLocalDateTime(value)
  const [timeInput, setTimeInput] = useState(() =>
    selected ? localTimeValue(selected) : '23:59',
  )

  function selectDate(date: Date | undefined) {
    if (!date) {
      return
    }

    const time = parseClockTime(timeInput) ?? { hours: 23, minutes: 59 }
    onChange(withDateAndTime(date, time.hours, time.minutes))
  }

  function updateTime(nextTime: string) {
    setTimeInput(nextTime)
    const time = parseClockTime(nextTime)
    if (selected && time) {
      onChange(withDateAndTime(selected, time.hours, time.minutes))
    }
  }

  function clearExpiration() {
    setTimeInput('23:59')
    onChange('')
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              'w-full justify-start font-normal',
              !selected && 'text-muted-foreground',
            )}
            disabled={disabled}
            aria-invalid={invalid}
          />
        }
      >
        <CalendarIcon />
        {selected ? dateTimeFormatter.format(selected) : 'Never expires'}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-0 p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={{ before: startOfToday() }}
          onSelect={selectDate}
        />
        <div className="grid gap-3 border-t p-4">
          <div className="grid gap-2">
            <label htmlFor={`${id}-time`} className="text-sm font-medium">
              Time
            </label>
            <div className="relative">
              <Clock3Icon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={`${id}-time`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="23:59"
                value={timeInput}
                maxLength={5}
                disabled={disabled}
                aria-label="Expiration time in 24-hour HH:mm format"
                aria-invalid={parseClockTime(timeInput) === null}
                className="px-8 font-mono tabular-nums"
                onChange={(event) =>
                  updateTime(
                    event.target.value.replace(/[^\d:]/g, '').slice(0, 5),
                  )
                }
                onBlur={() => {
                  if (!parseClockTime(timeInput)) {
                    setTimeInput(selected ? localTimeValue(selected) : '23:59')
                  }
                }}
              />
              {selected ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                  disabled={disabled}
                  aria-label="Clear expiration"
                  onClick={clearExpiration}
                >
                  <XIcon />
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Local time in 24-hour HH:mm format.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function parseLocalDateTime(value: string): Date | undefined {
  if (!value) {
    return undefined
  }

  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : undefined
}

function parseClockTime(
  value: string,
): { hours: number; minutes: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) {
    return null
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) {
    return null
  }

  return { hours, minutes }
}

function withDateAndTime(date: Date, hours: number, minutes: number): string {
  const selected = new Date(date)
  selected.setHours(hours, minutes, 0, 0)
  return toLocalDateTimeValue(selected)
}

function toLocalDateTimeValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function localTimeValue(date: Date): string {
  return [date.getHours(), date.getMinutes()]
    .map((part) => part.toString().padStart(2, '0'))
    .join(':')
}

function startOfToday(): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}
