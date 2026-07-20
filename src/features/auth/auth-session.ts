import { refreshAuthSession } from '@/features/auth/auth-api'
import { decodeStoredAuthSession } from '@/features/auth/auth-decoders'
import type { AuthSession, AuthState } from '@/features/auth/auth-types'
import { requestEmpty, type HttpFetcher } from '@/lib/api/client'
import { ApiError } from '@/lib/api/error'

const authSessionStorageKey = 'provider.auth.session.v1'
const authRefreshLockName = 'provider.auth.refresh'
const refreshWindowSeconds = 5 * 60

type AuthStateListener = () => void

const listeners = new Set<AuthStateListener>()
let authState = initialAuthState()
let refreshPromise: Promise<AuthSession | null> | undefined
let restorePromise: Promise<void> | undefined
let browserSubscriberCount = 0

export function getAuthState(): AuthState {
  return authState
}

export function subscribeAuthState(listener: AuthStateListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function startAuthSession(): () => void {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  browserSubscriberCount += 1

  if (browserSubscriberCount === 1) {
    window.addEventListener('storage', handleStorageChange)
    void restoreAuthSession()
  }

  return () => {
    browserSubscriberCount -= 1

    if (browserSubscriberCount === 0) {
      window.removeEventListener('storage', handleStorageChange)
    }
  }
}

export function establishAuthSession(session: AuthSession): void {
  writeStoredSession(session)
  setAuthState({ status: 'authenticated', session })
}

export function clearAuthSession(): void {
  removeStoredSession()
  setAuthState({ status: 'anonymous' })
}

export async function restoreAuthSession(): Promise<void> {
  if (restorePromise) {
    return restorePromise
  }

  restorePromise = restoreAuthSessionOnce().finally(() => {
    restorePromise = undefined
  })

  return restorePromise
}

export const authenticatedFetch: HttpFetcher = async (input, init) => {
  const session = await prepareAuthenticatedSession()

  if (!session) {
    throw authenticationRequiredError()
  }

  const request = new Request(input, init)
  const retryRequest = request.clone()
  const response = await fetch(withAccessToken(request, session.accessToken))

  if (response.status !== 401) {
    return response
  }

  const recoveredSession = await refreshStoredSession(
    session.accessToken,
    true,
  )

  if (!recoveredSession) {
    return response
  }

  return fetch(withAccessToken(retryRequest, recoveredSession.accessToken))
}

export async function logoutAuthSession(): Promise<void> {
  const session = readStoredSession()

  try {
    if (session) {
      await requestEmpty(
        '/api/v1/auth/logout',
        { method: 'POST' },
        authenticatedFetch,
      )
    }
  } finally {
    clearAuthSession()
  }
}

async function restoreAuthSessionOnce(): Promise<void> {
  const session = readStoredSession()

  if (!session || isRefreshExpired(session)) {
    clearAuthSession()
    return
  }

  if (!isAccessExpired(session)) {
    setAuthState({ status: 'authenticated', session })
    return
  }

  setAuthState({ status: 'restoring', session })

  try {
    await refreshStoredSession(session.accessToken, false)
  } catch {
    const latestSession = readStoredSession()

    if (latestSession && !isRefreshExpired(latestSession)) {
      setAuthState(
        isAccessExpired(latestSession)
          ? { status: 'recovery_error', session: latestSession }
          : { status: 'authenticated', session: latestSession },
      )
    }
  }
}

async function prepareAuthenticatedSession(): Promise<AuthSession | null> {
  const session = readStoredSession()

  if (!session || isRefreshExpired(session)) {
    clearAuthSession()
    return null
  }

  if (secondsUntil(session.accessExpiresAt) > refreshWindowSeconds) {
    setAuthState({ status: 'authenticated', session })
    return session
  }

  if (isAccessExpired(session)) {
    setAuthState({ status: 'restoring', session })
  }

  return refreshStoredSession(session.accessToken, false)
}

async function refreshStoredSession(
  observedAccessToken: string,
  force: boolean,
): Promise<AuthSession | null> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = withRefreshLock(() =>
    rotateStoredSession(observedAccessToken, force),
  ).finally(() => {
    refreshPromise = undefined
  })

  return refreshPromise
}

async function rotateStoredSession(
  observedAccessToken: string,
  force: boolean,
): Promise<AuthSession | null> {
  const currentSession = readStoredSession()

  if (!currentSession || isRefreshExpired(currentSession)) {
    clearAuthSession()
    return null
  }

  if (currentSession.accessToken !== observedAccessToken) {
    setAuthState({ status: 'authenticated', session: currentSession })
    return currentSession
  }

  if (
    !force &&
    secondsUntil(currentSession.accessExpiresAt) > refreshWindowSeconds
  ) {
    setAuthState({ status: 'authenticated', session: currentSession })
    return currentSession
  }

  const attemptedRefreshToken = currentSession.refreshToken

  try {
    const nextSession = await refreshAuthSession(attemptedRefreshToken)
    establishAuthSession(nextSession)
    return nextSession
  } catch (error) {
    const latestSession = readStoredSession()

    if (
      latestSession &&
      latestSession.refreshToken !== attemptedRefreshToken &&
      !isRefreshExpired(latestSession)
    ) {
      setAuthState({ status: 'authenticated', session: latestSession })
      return latestSession
    }

    if (isInvalidRefreshError(error)) {
      clearAuthSession()
      return null
    }

    if (!isAccessExpired(currentSession)) {
      setAuthState({ status: 'authenticated', session: currentSession })
      return currentSession
    } else {
      setAuthState({ status: 'recovery_error', session: currentSession })
    }

    throw error
  }
}

async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(authRefreshLockName, task)
  }

  return task()
}

function withAccessToken(request: Request, accessToken: string): Request {
  const headers = new Headers(request.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)
  return new Request(request, { headers })
}

function handleStorageChange(event: StorageEvent): void {
  if (event.storageArea !== window.localStorage) {
    return
  }

  if (event.key !== authSessionStorageKey && event.key !== null) {
    return
  }

  void restoreAuthSession()
}

function initialAuthState(): AuthState {
  const session = readStoredSession()

  if (!session || isRefreshExpired(session)) {
    removeStoredSession()
    return { status: 'anonymous' }
  }

  if (isAccessExpired(session)) {
    return { status: 'restoring', session }
  }

  return { status: 'authenticated', session }
}

function readStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const value = window.localStorage.getItem(authSessionStorageKey)

    if (value === null) {
      return null
    }

    return decodeStoredAuthSession(JSON.parse(value) as unknown)
  } catch {
    removeStoredSession()
    return null
  }
}

function writeStoredSession(session: AuthSession): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    authSessionStorageKey,
    JSON.stringify({ version: 1, session }),
  )
}

function removeStoredSession(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(authSessionStorageKey)
  } catch {
    // The in-memory state still transitions to anonymous when storage is unavailable.
  }
}

function setAuthState(nextState: AuthState): void {
  if (sameAuthState(authState, nextState)) {
    return
  }

  authState = nextState
  listeners.forEach((listener) => listener())
}

function sameAuthState(current: AuthState, next: AuthState): boolean {
  if (current.status !== next.status) {
    return false
  }

  if ('session' in current && 'session' in next) {
    return (
      current.session.accessToken === next.session.accessToken &&
      current.session.refreshToken === next.session.refreshToken
    )
  }

  return true
}

function isAccessExpired(session: AuthSession): boolean {
  return secondsUntil(session.accessExpiresAt) <= 0
}

function isRefreshExpired(session: AuthSession): boolean {
  return secondsUntil(session.refreshExpiresAt) <= 0
}

function secondsUntil(timestamp: number): number {
  return timestamp - Math.floor(Date.now() / 1000)
}

function isInvalidRefreshError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

function authenticationRequiredError(): ApiError {
  return new ApiError(401, {
    type: 'authentication_error',
    message: 'authentication required',
  })
}
