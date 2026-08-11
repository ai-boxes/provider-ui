// Display format for every user-visible timestamp in the app:
//   2026-08-06 19:59:44
// Uses the browser's local timezone. Input helpers for form controls stay separate.

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatDateTime(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return [
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`,
  ].join(' ')
}

/** Most management APIs return unix seconds. */
export function formatUnixSeconds(timestamp: number): string {
  return formatDateTime(new Date(timestamp * 1000))
}

/** Usage endpoints return unix milliseconds. */
export function formatUnixMs(timestamp: number): string {
  return formatDateTime(new Date(timestamp))
}
