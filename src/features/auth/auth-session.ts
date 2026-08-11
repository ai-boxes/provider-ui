import { getCurrentUser } from '@/features/auth/auth-api'
import { authRestoreFailureStatus } from '@/features/auth/auth-restore-policy'
import type { AuthState, AuthUser } from '@/features/auth/auth-types'
import {
  requestEmpty,
  sameOriginFetch,
  type HttpFetcher,
} from '@/lib/api/client'

type AuthStateListener = () => void

const listeners = new Set<AuthStateListener>()
let authState: AuthState = { status: 'loading' }
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
  browserSubscriberCount += 1
  if (browserSubscriberCount === 1) {
    void restoreAuthSession()
  }

  return () => {
    browserSubscriberCount -= 1
  }
}

export function establishAuthSession(user: AuthUser): void {
  setAuthState({ status: 'authenticated', user })
}

export function clearAuthSession(): void {
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
  if (authState.status !== 'authenticated') {
    return new Response(null, { status: 401 })
  }

  const response = await sameOriginFetch(input, init)
  if (response.status === 401) {
    clearAuthSession()
  }
  return response
}

export async function logoutAuthSession(): Promise<void> {
  try {
    if (authState.status === 'authenticated') {
      await requestEmpty(
        '/api/v1/auth/logout',
        { method: 'POST' },
        sameOriginFetch,
      )
    }
  } finally {
    clearAuthSession()
  }
}

async function restoreAuthSessionOnce(): Promise<void> {
  setAuthState({ status: 'loading' })
  try {
    establishAuthSession(await getCurrentUser())
  } catch (error) {
    if (authRestoreFailureStatus(error) === 'anonymous') {
      clearAuthSession()
      return
    }
    setAuthState({ status: 'recovery_error' })
  }
}

function setAuthState(nextState: AuthState): void {
  if (
    authState.status === nextState.status &&
    (authState.status !== 'authenticated' ||
      nextState.status !== 'authenticated' ||
      authState.user.id === nextState.user.id)
  ) {
    return
  }

  authState = nextState
  listeners.forEach((listener) => listener())
}
