import type { AuthUserRole } from '@/features/auth/auth-types'

export type ManagedUser = {
  id: string
  username: string
  role: AuthUserRole
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export type CreateUserInput = {
  username: string
  password: string
}

export type UpdateUserEnabledInput = {
  userId: string
  enabled: boolean
}

export type ResetUserPasswordInput = {
  userId: string
  password: string
}
