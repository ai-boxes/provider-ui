import { KeyRoundIcon } from 'lucide-react'

import { ResourcePagePlaceholder } from '@/components/layout/resource-page-placeholder'

export function ApiKeysPage() {
  return (
    <ResourcePagePlaceholder
      icon={KeyRoundIcon}
      title="API key management"
      description="Create and manage the downstream API keys used by clients to access models through your available providers."
    />
  )
}
