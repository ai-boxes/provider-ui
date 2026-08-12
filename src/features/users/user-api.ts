import { requestAuthenticatedData } from '@/features/auth/authenticated-request'
import {
  decodeCreatedRegistrationCode,
  decodeManagedUser,
  decodeManagedUsers,
} from '@/features/users/user-decoders'
import type {
  CreatedRegistrationCode,
  CreateUserInput,
  ManagedUser,
  ResetUserPasswordInput,
  UpdateUserEnabledInput,
  UpdateUserRoleInput,
} from '@/features/users/user-types'

const jsonHeaders = {
  'Content-Type': 'application/json',
}

export function getUsers(): Promise<ManagedUser[]> {
  return requestAuthenticatedData('/api/v1/users', decodeManagedUsers)
}

export function createRegistrationCode(): Promise<CreatedRegistrationCode> {
  return requestAuthenticatedData(
    '/api/v1/registration-codes',
    decodeCreatedRegistrationCode,
    { method: 'POST' },
  )
}

export function createUser(input: CreateUserInput): Promise<ManagedUser> {
  return requestAuthenticatedData('/api/v1/users', decodeManagedUser, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      username: input.username,
      password: input.password,
    }),
  })
}

export function updateUserEnabled(
  input: UpdateUserEnabledInput,
): Promise<ManagedUser> {
  return requestAuthenticatedData(
    userEndpoint(input.userId),
    decodeManagedUser,
    {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({
        enabled: input.enabled,
      }),
    },
  )
}

export function updateUserRole(
  input: UpdateUserRoleInput,
): Promise<ManagedUser> {
  return requestAuthenticatedData(
    `${userEndpoint(input.userId)}/role`,
    decodeManagedUser,
    {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ role: input.role }),
    },
  )
}

export function resetUserPassword(
  input: ResetUserPasswordInput,
): Promise<ManagedUser> {
  return requestAuthenticatedData(
    `${userEndpoint(input.userId)}/password`,
    decodeManagedUser,
    {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({
        password: input.password,
      }),
    },
  )
}

function userEndpoint(userId: string): string {
  return `/api/v1/users/${encodeURIComponent(userId)}`
}
