import type { Location } from 'react-router'

type AuthNavigationState = {
  returnTo?: unknown
}

export function authReturnState(location: Location): AuthNavigationState {
  return { returnTo: `${location.pathname}${location.search}${location.hash}` }
}

export function readAuthReturnTo(state: unknown): string {
  if (!isRecord(state) || typeof state.returnTo !== 'string') {
    return '/'
  }

  const returnTo = state.returnTo
  if (
    !returnTo.startsWith('/') ||
    returnTo.startsWith('//') ||
    isAuthenticationPath(returnTo)
  ) {
    return '/'
  }

  return returnTo
}

function isAuthenticationPath(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0]
  return pathname === '/login' || pathname === '/setup'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
