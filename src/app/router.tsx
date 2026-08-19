import { createBrowserRouter } from 'react-router'

import { AuthRouteBoundary } from '@/app/auth-route-boundary'
import { HomeRedirect } from '@/app/home-redirect'
import { SuperAdminRouteBoundary } from '@/app/super-admin-route-boundary'
import { LoginPage } from '@/routes/login-page'
import { SetupPage } from '@/routes/setup-page'

export const router = createBrowserRouter([
  {
    Component: AuthRouteBoundary,
    hydrateFallbackElement: (
      <div className="min-h-svh bg-background" aria-busy="true" />
    ),
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
            Component: HomeRedirect,
          },
          {
            path: '/api-keys',
            lazy: async () => {
              const { ApiKeysPage } = await import('@/routes/api-keys-page')
              return { Component: ApiKeysPage }
            },
          },
          {
            path: '/usage',
            lazy: async () => {
              const { UsagePage } = await import('@/routes/usage-page')
              return { Component: UsagePage }
            },
          },
          {
            Component: SuperAdminRouteBoundary,
            children: [
              {
                path: '/dashboard',
                lazy: async () => {
                  const { DashboardPage } = await import(
                    '@/routes/dashboard-page'
                  )
                  return { Component: DashboardPage }
                },
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
                path: '/providers/:accountId',
                lazy: async () => {
                  const { ProviderDetailPage } = await import(
                    '@/routes/provider-detail-page'
                  )
                  return { Component: ProviderDetailPage }
                },
              },
              {
                path: '/users',
                lazy: async () => {
                  const { UsersPage } = await import('@/routes/users-page')
                  return { Component: UsersPage }
                },
              },
            ],
          },
          {
            path: '*',
            lazy: async () => {
              const { NotFoundPage } = await import('@/routes/not-found-page')
              return { Component: NotFoundPage }
            },
          },
        ],
      },
    ],
  },
])
