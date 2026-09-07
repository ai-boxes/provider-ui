import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/app/app'
import { installChunkReloadRecovery } from '@/app/chunk-reload-recovery'

import './index.css'

installChunkReloadRecovery()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
