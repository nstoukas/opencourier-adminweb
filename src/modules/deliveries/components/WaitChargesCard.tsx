import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/admin-web-components'
import type { DeliveryAdminDto } from '@/backend-admin-sdk'
import { formatMoney } from '@/utils/formatMoney'
import { formatOptionalDate } from '../../../ui-shared-utils'

// Spec 0033 (decision 23.20): what the restaurant was charged for keeping riders waiting. The rider's
// side of each one is the "Courier paid for wait" event in the timeline.
export const WaitChargesCard: React.FC<{ delivery: DeliveryAdminDto }> = ({ delivery }) => {
  const charges = delivery.waitCharges ?? []
  if (charges.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Restaurant delay charges</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          {charges.map((charge) => (
            <React.Fragment key={charge.createdAt}>
              <dt className="text-muted-foreground">{formatOptionalDate(charge.createdAt)}</dt>
              <dd className="font-medium break-words">
                {formatMoney(charge.amount, charge.currencyCode) ?? String(charge.amount)}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
