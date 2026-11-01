import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/admin-web-components'
import type { DeliveryAdminDto } from '@/backend-admin-sdk'
import { formatMoney } from '@/utils/formatMoney'
import { formatOptionalDate } from '../../../ui-shared-utils'
import { humanizeStatus } from '@/utils/deliveryEventDisplay'
import { cancelledByText, foodOutcomeText, wasAcceptedWhenCancelled } from '../utils/cancellationDisplay'

// Spec 0015, AC-13: who cancelled, from where, the restaurant's charge and the food. The rider's
// pay is the "Courier paid for cancellation" event in the timeline, with its amount and policy.
export const CancellationCard: React.FC<{ delivery: DeliveryAdminDto }> = ({ delivery }) => {
  if (!delivery.cancelledAt) return null

  const accepted = wasAcceptedWhenCancelled(delivery.cancelledFromStatus)
  const charge = delivery.partnerCharge
  const rows: { label: string; value: string }[] = [
    { label: 'Who asked', value: cancelledByText(delivery.cancelledBy) },
    { label: 'Cancelled', value: formatOptionalDate(delivery.cancelledAt) },
    { label: 'Cancelled from', value: humanizeStatus(delivery.cancelledFromStatus) },
    {
      label: 'Rider’s pay',
      value: accepted
        ? 'Paid under the co-op’s cancelled job pay: see “Courier paid for cancellation” in the events'
        : 'None: no rider had accepted it',
    },
    {
      label: 'Restaurant charge',
      value: charge ? (formatMoney(charge.amount, charge.currencyCode) ?? String(charge.amount)) : 'None',
    },
    { label: 'Food', value: foodOutcomeText(delivery.cancelledFromStatus, delivery.foodOutcome) },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Cancellation</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          {rows.map((row) => (
            <React.Fragment key={row.label}>
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium break-words">{row.value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
