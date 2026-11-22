import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/admin-web-components'
import type { DeliveryAdminDto } from '@/backend-admin-sdk'
import { useFormat } from '@/i18n/useFormat'
import { statusText } from '@/utils/deliveryEventDisplay'
import { optionalDateTime } from '../utils/optionalDate'
import { cancelledByText, foodOutcomeText, wasAcceptedWhenCancelled } from '../utils/cancellationDisplay'

// Spec 0015, AC-13: who cancelled, from where, the restaurant's charge and the food. The rider's
// pay is the "Courier paid for cancellation" event in the timeline, with its amount and policy.
export const CancellationCard: React.FC<{ delivery: DeliveryAdminDto }> = ({ delivery }) => {
  // useTranslation gives t, which looks a key up in the reader's language. Hooks come before the
  // early return: React needs the same hooks in the same order on every render.
  const { t } = useTranslation()
  // Dates and money in the reader's language (spec 0054, AC-3).
  const f = useFormat()
  if (!delivery.cancelledAt) return null

  const accepted = wasAcceptedWhenCancelled(delivery.cancelledFromStatus)
  const charge = delivery.partnerCharge
  const rows: { label: string; value: string }[] = [
    { label: t('deliveries.cancellation.whoAsked'), value: cancelledByText(delivery.cancelledBy, t) },
    { label: t('deliveries.cancellation.cancelled'), value: optionalDateTime(f, delivery.cancelledAt) },
    { label: t('deliveries.cancellation.cancelledFrom'), value: statusText(t, delivery.cancelledFromStatus) },
    {
      label: t('deliveries.cancellation.riderPay'),
      value: accepted ? t('deliveries.cancellation.riderPaid') : t('deliveries.cancellation.riderNotPaid'),
    },
    {
      label: t('deliveries.cancellation.restaurantCharge'),
      value: charge ? f.money(charge.amount, charge.currencyCode) : t('deliveries.cancellation.none'),
    },
    { label: t('deliveries.cancellation.food.label'), value: foodOutcomeText(delivery.cancelledFromStatus, delivery.foodOutcome, t) },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('deliveries.cancellation.title')}</CardTitle>
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
