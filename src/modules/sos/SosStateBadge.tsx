import type { SosIncidentAdminDto } from '@/backend-admin-sdk'
import { Badge } from '../../admin-web-components'
import { STATE_LABELS } from './sosDisplay'

// An SOS's state at a glance: red while active, amber while awaiting an admin's close.
export function SosStateBadge({ state }: { state: SosIncidentAdminDto['state'] }) {
  const variant = state === 'ACTIVE' ? 'destructive' : state === 'AWAITING_CLOSE' ? 'warning' : 'outline'
  return <Badge variant={variant}>{STATE_LABELS[state]}</Badge>
}
