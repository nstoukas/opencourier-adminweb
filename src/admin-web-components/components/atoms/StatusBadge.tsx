import * as React from 'react'

import { cn } from '../../../ui-shared-utils'
import { EnumCourierStatus } from '../../../shared-types/delivery'
import { EnumDeliveryStatus } from '../../../shared-types/delivery-events'
import { Badge, type BadgeProps } from './Badge'

// One entry per backend enum value: the words a person reads, and the Badge look.
// `NonNullable<BadgeProps['variant']>` borrows the list of variant names from Badge,
// so a typo here (say 'sucess') is a type error instead of a silently plain badge.
type StatusEntry = { label: string; variant: NonNullable<BadgeProps['variant']> }

// `Record<EnumDeliveryStatus, StatusEntry>` means "an object with exactly one key per enum
// value". If the backend gains a status and src/shared-types gets it, this line stops
// compiling until the new status has a label here.
// The labels and looks are the design system's (opencourier-design-system,
// components/StatusBadge), so every OpenCourier app shows the same words.
const DELIVERY_STATUSES: Record<EnumDeliveryStatus, StatusEntry> = {
  CREATED: { label: 'Created', variant: 'secondary' },
  ASSIGNING_COURIER: { label: 'Assigning Courier', variant: 'secondary' },
  ACCEPTED: { label: 'Accepted', variant: 'secondary' },
  DISPATCHED: { label: 'Dispatched', variant: 'secondary' },
  COURIER_ARRIVED_AT_PICKUP_LOCATION: { label: 'Courier at Pickup', variant: 'secondary' },
  PICKED_UP: { label: 'Picked Up', variant: 'secondary' },
  ON_THE_WAY: { label: 'On the Way', variant: 'secondary' },
  COURIER_ARRIVED_AT_DROPOFF_LOCATION: { label: 'Courier at Dropoff', variant: 'secondary' },
  DROPPED_OFF: { label: 'Dropped Off', variant: 'default' },
  CANCELED: { label: 'Canceled', variant: 'destructive' },
  FAILED: { label: 'Failed', variant: 'destructive' },
}

// Courier statuses. These also get a colored dot, so status is never color alone.
const COURIER_STATUSES: Record<EnumCourierStatus, StatusEntry> = {
  ONLINE: { label: 'Online', variant: 'success' },
  LAST_CALL: { label: 'Last Call', variant: 'warning' },
  OFFLINE: { label: 'Offline', variant: 'outline' },
}

const COURIER_DOT: Record<EnumCourierStatus, string> = {
  ONLINE: 'bg-success',
  // The yellow dot gets a thin ink ring, so it still shows on the pale yellow badge.
  LAST_CALL: 'bg-warning ring-1 ring-warning-foreground/35',
  OFFLINE: 'bg-destructive',
}

// An unknown value (a status added to the backend before this copy learns it) still reads
// as words: 'SOME_NEW_STATUS' becomes 'Some new status'.
function fallbackLabel(status: string) {
  const words = status.replace(/_/g, ' ').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export interface StatusBadgeProps {
  /** The enum value exactly as the API returns it, for example 'PICKED_UP'. */
  status: string
  /** Which table to read. 'courier' adds a status dot. Default 'delivery'. */
  kind?: 'delivery' | 'courier'
  className?: string
}

/**
 * Shows a delivery or courier status from its backend enum, with the same label and look
 * everywhere. Never format a status yourself; pass the enum here.
 */
function StatusBadge({ status, kind = 'delivery', className }: StatusBadgeProps) {
  // The tables are keyed by the enums, but the API hands us a plain string, so we read them
  // as string keyed maps and fall back when the string is not one we know.
  const table: Record<string, StatusEntry | undefined> = kind === 'courier' ? COURIER_STATUSES : DELIVERY_STATUSES
  const entry = table[status] ?? { label: fallbackLabel(status), variant: 'secondary' }
  const dot = (COURIER_DOT as Record<string, string | undefined>)[status] ?? 'bg-muted-foreground'
  return (
    // whitespace-nowrap and shrink-0 keep a two word label like "Dropped Off" on one line
    // inside a narrow table cell.
    <Badge variant={entry.variant} className={cn('shrink-0 gap-1.5 whitespace-nowrap', className)} data-status={status}>
      {kind === 'courier' && <span aria-hidden="true" className={cn('size-1.5 rounded-full', dot)} />}
      {entry.label}
    </Badge>
  )
}

// Exported for filters and legends, so they can list the same words the badges show.
StatusBadge.deliveryStatuses = DELIVERY_STATUSES
StatusBadge.courierStatuses = COURIER_STATUSES

export { StatusBadge }
