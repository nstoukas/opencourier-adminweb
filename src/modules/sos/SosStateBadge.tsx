import { useTranslation } from 'react-i18next'
import type { SosIncidentAdminDto } from '@/backend-admin-sdk'
import { Badge } from '../../admin-web-components'
import { stateLabel } from './sosDisplay'

// An SOS's state at a glance: red while active, amber while awaiting an admin's close.
export function SosStateBadge({ state }: { state: SosIncidentAdminDto['state'] }) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const variant = state === 'ACTIVE' ? 'destructive' : state === 'AWAITING_CLOSE' ? 'warning' : 'outline'
  return <Badge variant={variant}>{stateLabel(state, t)}</Badge>
}
