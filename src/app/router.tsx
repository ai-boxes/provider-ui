import { createBrowserRouter } from 'react-router'

import { IndexPage } from '@/routes/index-page'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: IndexPage,
  },
])
