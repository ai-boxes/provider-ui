import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { AuthPageLayout } from '@/components/layout/auth-page-layout'
import { CredentialsForm } from '@/features/auth/credentials-form'
import { readAuthReturnTo } from '@/features/auth/auth-navigation'
import { establishAuthSession } from '@/features/auth/auth-session'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <AuthPageLayout>
      <CredentialsForm
        key={mode}
        mode={mode}
        onModeChange={setMode}
        onSuccess={(session) => {
          establishAuthSession(session)
          navigate(readAuthReturnTo(location.state), { replace: true })
        }}
      />
    </AuthPageLayout>
  )
}
