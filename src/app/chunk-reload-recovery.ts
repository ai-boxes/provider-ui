const reloadAttemptKey = 'provider-ui:chunk-reload-attempt'
const reloadCooldownMs = 60_000

type ReloadAttempt = {
  failure: string
  attemptedAt: number
}

let memoryAttempt: ReloadAttempt | null = null

export function installChunkReloadRecovery(target: Window = window) {
  target.addEventListener('vite:preloadError', (event) => {
    const failure = chunkFailureKey(
      (event as Event & { payload?: unknown }).payload,
    )
    if (!claimReloadAttempt(target.sessionStorage, failure)) return

    event.preventDefault()
    target.location.reload()
  })
}

export function chunkFailureKey(payload: unknown): string {
  if (payload instanceof Error) return `${payload.name}:${payload.message}`
  if (typeof payload === 'string') return payload
  return 'unknown-dynamic-import'
}

export function claimReloadAttempt(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  failure: string,
  now = Date.now(),
): boolean {
  let previous = memoryAttempt
  try {
    previous = parseReloadAttempt(storage.getItem(reloadAttemptKey)) ?? previous
  } catch {}

  if (
    previous?.failure === failure &&
    now - previous.attemptedAt < reloadCooldownMs
  ) {
    return false
  }

  const attempt = { failure, attemptedAt: now }
  memoryAttempt = attempt
  try {
    storage.setItem(reloadAttemptKey, JSON.stringify(attempt))
  } catch {}
  return true
}

function parseReloadAttempt(value: string | null): ReloadAttempt | null {
  if (value === null) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as ReloadAttempt).failure === 'string' &&
      typeof (parsed as ReloadAttempt).attemptedAt === 'number'
    ) {
      return parsed as ReloadAttempt
    }
  } catch {}
  return null
}
