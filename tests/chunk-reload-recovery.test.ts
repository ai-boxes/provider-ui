import assert from 'node:assert/strict'
import test from 'node:test'

import {
  chunkFailureKey,
  claimReloadAttempt,
  installChunkReloadRecovery,
} from '../src/app/chunk-reload-recovery.ts'

function storage() {
  const values = new Map<string, string>()
  return {
    getItem(key: string) {
      return values.get(key) ?? null
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
}

test('reloads once for the same missing chunk during the cooldown', () => {
  const session = storage()

  assert.equal(claimReloadAttempt(session, 'missing-a.js', 1_000), true)
  assert.equal(claimReloadAttempt(session, 'missing-a.js', 2_000), false)
  assert.equal(claimReloadAttempt(session, 'missing-b.js', 2_000), true)
  assert.equal(claimReloadAttempt(session, 'missing-a.js', 62_000), true)
})

test('uses the dynamic import error as the reload identity', () => {
  assert.equal(
    chunkFailureKey(new TypeError('Failed to fetch dynamically imported module: /old.js')),
    'TypeError:Failed to fetch dynamically imported module: /old.js',
  )
  assert.equal(chunkFailureKey('missing.js'), 'missing.js')
  assert.equal(chunkFailureKey(undefined), 'unknown-dynamic-import')
})

test('prevents the route error and reloads only for the first matching event', () => {
  let listener: ((event: Event) => void) | undefined
  let reloads = 0
  const target = {
    addEventListener(_type: string, next: (event: Event) => void) {
      listener = next
    },
    sessionStorage: storage(),
    location: {
      reload() {
        reloads += 1
      },
    },
  }
  installChunkReloadRecovery(target as unknown as Window)

  const first = Object.assign(new Event('vite:preloadError', { cancelable: true }), {
    payload: new TypeError('missing-event-test.js'),
  })
  listener?.(first)
  assert.equal(first.defaultPrevented, true)
  assert.equal(reloads, 1)

  const repeated = Object.assign(
    new Event('vite:preloadError', { cancelable: true }),
    { payload: new TypeError('missing-event-test.js') },
  )
  listener?.(repeated)
  assert.equal(repeated.defaultPrevented, false)
  assert.equal(reloads, 1)
})
