import { UsersIcon } from 'lucide-react'

import { ResourcePagePlaceholder } from '@/components/layout/resource-page-placeholder'

export function UsersPage() {
  return (
    <ResourcePagePlaceholder
      icon={UsersIcon}
      title="User administration"
      description="Manage the users who can sign in to this control plane. Provider access continues to follow ownership and visibility rules."
    />
  )
}
