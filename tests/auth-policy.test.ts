import assert from 'node:assert/strict'
import test from 'node:test'

import { readAuthReturnTo } from '../src/features/auth/auth-navigation.ts'
import { authRestoreFailureStatus } from '../src/features/auth/auth-restore-policy.ts'
import {
  canAccessSuperAdminRoutes,
  homePathForRole,
} from '../src/features/auth/auth-route-policy.ts'

test('session restore treats only an explicit 401 as anonymous', () => {
  assert.equal(authRestoreFailureStatus({ status: 401 }), 'anonymous')
  assert.equal(authRestoreFailureStatus({ status: 403 }), 'recovery_error')
  assert.equal(authRestoreFailureStatus(new TypeError('offline')), 'recovery_error')
})

test('role policy keeps ordinary users out of management routes', () => {
  assert.equal(homePathForRole('super_admin'), '/providers')
  assert.equal(homePathForRole('user'), '/api-keys')
  assert.equal(canAccessSuperAdminRoutes('super_admin'), true)
  assert.equal(canAccessSuperAdminRoutes('user'), false)
})

test('authentication return paths remain same-origin and non-recursive', () => {
  assert.equal(
    readAuthReturnTo({ returnTo: '/usage?window=24h#requests' }),
    '/usage?window=24h#requests',
  )
  assert.equal(readAuthReturnTo({ returnTo: '//evil.example/path' }), '/')
  assert.equal(readAuthReturnTo({ returnTo: '/login?next=/usage' }), '/')
  assert.equal(readAuthReturnTo({ returnTo: 'https://evil.example' }), '/')
})
