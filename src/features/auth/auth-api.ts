import { decodeSetupStatus, decodeAuthUser } from '@/features/auth/auth-decoders'
import type {
  AuthUser,
  RegistrationCredentials,
  UserCredentials,
} from '@/features/auth/auth-types'
import {
  requestData,
  requestEmpty,
  sameOriginFetch,
} from '@/lib/api/client'

const jsonHeaders = { 'Content-Type': 'application/json' }

export function getSetupStatus(): Promise<{ required: boolean }> {
  return requestData(
    '/api/v1/auth/setup',
    decodeSetupStatus,
    undefined,
    sameOriginFetch,
  )
}

export async function setupInitialUser(
  credentials: UserCredentials,
): Promise<AuthUser> {
  await requestEmpty(
    '/api/v1/auth/setup',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(credentials),
    },
    sameOriginFetch,
  )
  return getCurrentUser()
}

export async function login(credentials: UserCredentials): Promise<AuthUser> {
  await requestEmpty(
    '/api/v1/auth/login',
    { method: 'POST', headers: jsonHeaders, body: JSON.stringify(credentials) },
    sameOriginFetch,
  )
  return getCurrentUser()
}

export async function register(
  credentials: RegistrationCredentials,
): Promise<AuthUser> {
  await requestEmpty(
    '/api/v1/auth/register',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
        invitation_code: credentials.invitationCode,
      }),
    },
    sameOriginFetch,
  )
  return getCurrentUser()
}

export function getCurrentUser(): Promise<AuthUser> {
  return requestData(
    '/api/v1/auth/me',
    decodeAuthUser,
    undefined,
    sameOriginFetch,
  )
}
