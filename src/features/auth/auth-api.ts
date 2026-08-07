import {
  decodeAuthSession,
  decodeSetupStatus,
} from '@/features/auth/auth-decoders'
import type {
  AuthSession,
  RegistrationCredentials,
  UserCredentials,
} from '@/features/auth/auth-types'
import { requestData } from '@/lib/api/client'

const jsonHeaders = {
  'Content-Type': 'application/json',
}

export function getSetupStatus(): Promise<{ required: boolean }> {
  return requestData('/api/v1/auth/setup', decodeSetupStatus)
}

export function setupInitialUser(
  credentials: UserCredentials,
): Promise<AuthSession> {
  return requestData('/api/v1/auth/setup', decodeAuthSession, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(credentials),
  })
}

export function login(credentials: UserCredentials): Promise<AuthSession> {
  return requestData('/api/v1/auth/login', decodeAuthSession, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(credentials),
  })
}

export function register(
  credentials: RegistrationCredentials,
): Promise<AuthSession> {
  return requestData('/api/v1/auth/register', decodeAuthSession, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      username: credentials.username,
      password: credentials.password,
      invitation_code: credentials.invitationCode,
    }),
  })
}

export function refreshAuthSession(refreshToken: string): Promise<AuthSession> {
  return requestData('/api/v1/auth/refresh', decodeAuthSession, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}
