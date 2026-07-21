import { Navigate, createBrowserRouter } from 'react-router'

import { AuthRouteBoundary } from '@/app/auth-route-boundary'
import { SuperAdminRouteBoundary } from '@/app/super-admin-route-boundary'
import { LoginPage } from '@/routes/login-page'
import { SetupPage } from '@/routes/setup-page'

export const router = createBrowserRouter([
  {
    Component: AuthRouteBoundary,
    children: [
      {
        path: '/setup',
        Component: SetupPage,
      },
      {
        path: '/login',
        Component: LoginPage,
      },
      {
        lazy: async () => {
          const { AppShell } = await import('@/components/layout/app-shell')
          return { Component: AppShell }
        },
        children: [
          {
            index: true,
            element: <Navigate to="/providers" replace />,
          },
          {
            path: '/providers',
            lazy: async () => {
              const { ProvidersPage } = await import(
                '@/routes/providers-page'
              )
              return { Component: ProvidersPage }
            },
          },
          {
            path: '/providers/new',
            lazy: async () => {
              const { NewProviderPage } = await import(
                '@/routes/new-provider-page'
              )
              return { Component: NewProviderPage }
            },
          },
          {
            path: '/providers/:accountId',
            lazy: async () => {
              const { ProviderDetailPage } = await import(
                '@/routes/provider-detail-page'
              )
              return { Component: ProviderDetailPage }
            },
          },
          {
            path: '/api-keys',
            lazy: async () => {
              const { ApiKeysPage } = await import('@/routes/api-keys-page')
              return { Component: ApiKeysPage }
            },
          },
          {
            Component: SuperAdminRouteBoundary,
            children: [
              {
                path: '/users',
                lazy: async () => {
                  const { UsersPage } = await import('@/routes/users-page')
                  return { Component: UsersPage }
                },
              },
            ],
          },
        ],
      },
    ],
  },
])
