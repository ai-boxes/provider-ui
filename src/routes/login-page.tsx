import { useNavigate } from 'react-router'

import { AuthPageLayout } from '@/components/layout/auth-page-layout'
import { CredentialsForm } from '@/features/auth/credentials-form'
import { establishAuthSession } from '@/features/auth/auth-session'

export function LoginPage() {
  const navigate = useNavigate()

  return (
    <AuthPageLayout>
      <CredentialsForm
        mode="login"
        onSuccess={(session) => {
          establishAuthSession(session)
          navigate('/', { replace: true })
        }}
      />
    </AuthPageLayout>
  )
}
