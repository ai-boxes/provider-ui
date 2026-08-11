import { ProviderList } from '@/features/providers/provider-list'
import { useAuthState } from '@/features/auth/use-auth-state'

export function ProvidersPage() {
  const authState = useAuthState()

  if (authState.status !== 'authenticated') {
    return null
  }

  return <ProviderList currentUserId={authState.user.id} />
}
