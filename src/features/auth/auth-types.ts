export type AuthUserRole = 'super_admin' | 'user'

export type AuthUser = {
  id: string
  username: string
  role: AuthUserRole
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export type AuthSession = {
  user: AuthUser
  accessToken: string
  refreshToken: string
  accessExpiresAt: number
  refreshExpiresAt: number
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'restoring'; session: AuthSession }
  | { status: 'authenticated'; session: AuthSession }
  | { status: 'recovery_error'; session: AuthSession }

export type UserCredentials = {
  username: string
  password: string
}
