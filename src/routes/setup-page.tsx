import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { AuthPageLayout } from '@/components/layout/auth-page-layout'
import { CredentialsForm } from '@/features/auth/credentials-form'
import { establishAuthSession } from '@/features/auth/auth-session'
import {
  setupStatusQueryKey,
  setupStatusQueryOptions,
} from '@/features/auth/setup-status-query'

export function SetupPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return (
    <AuthPageLayout>
      <CredentialsForm
        mode="setup"
        onSuccess={(user) => {
          queryClient.setQueryData(setupStatusQueryKey, { required: false })
          establishAuthSession(user)
          navigate('/', { replace: true })
        }}
        onSetupConflict={() => {
          void queryClient.invalidateQueries({
            queryKey: setupStatusQueryOptions.queryKey,
          })
        }}
      />
    </AuthPageLayout>
  )
}
