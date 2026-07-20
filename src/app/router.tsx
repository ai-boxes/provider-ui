import { createBrowserRouter } from 'react-router'

import { AuthRouteBoundary } from '@/app/auth-route-boundary'
import { IndexPage } from '@/routes/index-page'
import { LoginPage } from '@/routes/login-page'
import { SetupPage } from '@/routes/setup-page'

export const router = createBrowserRouter([
  {
    Component: AuthRouteBoundary,
    children: [
      {
        path: '/',
        Component: IndexPage,
      },
      {
        path: '/setup',
        Component: SetupPage,
      },
      {
        path: '/login',
        Component: LoginPage,
      },
    ],
  },
])
