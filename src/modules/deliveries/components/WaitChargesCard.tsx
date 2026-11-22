import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/admin-web-components'
import type { DeliveryAdminDto } from '@/backend-admin-sdk'
import { useFormat } from '@/i18n/useFormat'
import { optionalDateTime } from '../utils/optionalDate'

// Spec 0033 (decision 23.20): what the restaurant was charged for keeping riders waiting. The rider's
// side of each one is the "Courier paid for wait" event in the timeline.
export const WaitChargesCard: React.FC<{ delivery: DeliveryAdminDto }> = ({ delivery }) => {
  // useTranslation gives t, which looks a key up in the reader's language. Hooks come before the
  // early return: React needs the same hooks in the same order on every render.
  const { t } = useTranslation()
  // Dates and money in the reader's language (spec 0054, AC-3).
  const f = useFormat()
  const charges = delivery.waitCharges ?? []
  if (charges.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('deliveries.waitCharges.title')}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          {charges.map((charge, index) => (
            <React.Fragment key={`${charge.createdAt}-${index}`}>
              <dt className="text-muted-foreground">{optionalDateTime(f, charge.createdAt)}</dt>
              <dd className="font-medium break-words">
                {f.money(charge.amount, charge.currencyCode)}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
