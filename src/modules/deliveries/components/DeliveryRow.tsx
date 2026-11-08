import React from 'react'
import { StatusBadge } from '@/admin-web-components'
import type { DeliveryAdminDto } from '@/backend-admin-sdk'
import { shortId } from '@/utils/shortId'

// One delivery in a card: its reference and short id, a line under it, its status, and whatever
// the card adds on the right (a date, the rider's pay). Links to the delivery. Shared by the
// courier page (spec 0012) and the restaurant page (spec 0024).
export function DeliveryRow({
  delivery,
  onOpen,
  extra,
  subtitle,
}: {
  delivery: DeliveryAdminDto
  onOpen: (id: string) => void
  extra?: React.ReactNode
  // The line under the reference. By default "restaurant → customer"; the restaurant page passes
  // the customer only, since its own name is already the page's title.
  subtitle?: React.ReactNode
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-b-0">
      <div className="min-w-0">
        <a
          href={`/deliveries/${delivery.id}`}
          onClick={(event) => {
            // A ctrl, cmd, shift or middle click opens a new tab as the browser normally does.
            if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
              event.preventDefault()
              onOpen(delivery.id)
            }
          }}
          className="text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {delivery.orderReference ? `${delivery.orderReference} · ` : ''}
          <span className="font-mono">{shortId(delivery.id)}</span>
        </a>
        <p className="text-xs text-muted-foreground">
          {subtitle ?? `${delivery.pickupBusinessName || '—'} → ${delivery.dropoffName || '—'}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {extra}
        {/* A minimum width, so the date and pay line up for the usual labels, and a long one
            ("Courier at Dropoff") widens the slot instead of covering the pay. */}
        <span className="flex min-w-28 justify-end">
          <StatusBadge status={delivery.status} />
        </span>
      </div>
    </li>
  )
}
