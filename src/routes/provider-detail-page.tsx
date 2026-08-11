import { Navigate, useParams } from 'react-router'

import { useAuthState } from '@/features/auth/use-auth-state'
import { ProviderDetail } from '@/features/providers/provider-detail'

export function ProviderDetailPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const authState = useAuthState()

  if (!accountId) {
    return <Navigate to="/providers" replace />
  }

  if (authState.status !== 'authenticated') {
    return null
  }

  return (
    <ProviderDetail
      accountId={accountId}
      currentUserId={authState.user.id}
    />
  )
}
