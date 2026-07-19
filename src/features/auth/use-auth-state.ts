import { useSyncExternalStore } from 'react'

import {
  getAuthState,
  subscribeAuthState,
} from '@/features/auth/auth-session'

export function useAuthState() {
  return useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
}
