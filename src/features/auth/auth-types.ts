export type AuthUserRole = 'super_admin' | 'user'

export type AuthUser = {
  id: string
  username: string
  role: AuthUserRole
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'recovery_error' }

export type UserCredentials = {
  username: string
  password: string
}

export type RegistrationCredentials = UserCredentials & {
  invitationCode: string
}
