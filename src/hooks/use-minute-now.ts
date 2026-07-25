import { useEffect, useState } from 'react'

const listeners = new Set<(now: number) => void>()
let timer: ReturnType<typeof setInterval> | null = null

function unixSeconds(): number {
  return Date.now() / 1000
}

// Current time in unix seconds, matching every timestamp the API returns.
// One shared interval drives all subscribers so a list of relative timestamps
// does not create one timer per row.
export function useMinuteNow(): number {
  const [now, setNow] = useState(unixSeconds)

  useEffect(() => {
    listeners.add(setNow)

    timer ??= setInterval(() => {
      const nextNow = unixSeconds()
      listeners.forEach((listener) => listener(nextNow))
    }, 60_000)

    return () => {
      listeners.delete(setNow)

      if (listeners.size === 0 && timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }
  }, [])

  return now
}
