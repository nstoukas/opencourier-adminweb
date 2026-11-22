import React from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/admin-web-components'
import { useGetDeliveryRemovalRequestsQuery } from '@/api/removalRequestApi'
import { usePageVisible } from '@/hooks/usePageVisible'
import { EnumRemovalRequestStatus } from '@/shared-types'
import { enumLabel } from '@/i18n/enumLabel'
import { useFormat, type Formats } from '@/i18n/useFormat'
import type { RemovalRequestAdminDto } from '@/backend-admin-sdk'
import { removalLabelText } from '../utils/removalLabel'

// Who answered, and when. Only an admin's answer has one: a withdrawn or closed request was decided by nobody.
// Takes `t` and the formats so the sentence and its time are in the reader's language.
function decisionWords(request: RemovalRequestAdminDto, t: TFunction, f: Formats): string | null {
  const answered =
    request.status === EnumRemovalRequestStatus.APPROVED || request.status === EnumRemovalRequestStatus.DECLINED
  if (!answered || !request.decidedAt) return null
  const who = request.decidedBy?.username || request.decidedBy?.email || t('deliveries.removal.anAdmin')
  const key =
    request.status === EnumRemovalRequestStatus.APPROVED ? 'deliveries.removal.approvedBy' : 'deliveries.removal.declinedBy'
  // f.atTime is "at 13:05", with the right Greek word for "at" at one o'clock.
  return t(key, { who, at: f.atTime(request.decidedAt) })
}

// This delivery's requests to take a rider off it, newest first (spec 0035, AC-24).
// Shown here only: nothing counts or groups a rider's requests (value 5).
export function DeliveryRemovalRequests({ deliveryId }: { deliveryId: string }) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // Dates on Athens time in the reader's language; f.language picks which label of a reason to show.
  const f = useFormat()
  const pageVisible = usePageVisible()
  // `currentData` is empty while another delivery's list loads, so going between two deliveries
  // never shows the previous one's requests under this delivery.
  const requestsQuery = useGetDeliveryRemovalRequestsQuery(
    { deliveryId },
    { skip: !deliveryId, pollingInterval: pageVisible ? 30_000 : 0 }
  )
  const { currentData: requests, isError } = requestsQuery

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('deliveries.removal.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isError ? (
          <div className="text-destructive">{t('deliveries.removal.loadFailed')}</div>
        ) : requests === undefined ? (
          <div className="text-muted-foreground">{t('deliveries.removal.loading')}</div>
        ) : requests.length === 0 ? (
          <div className="text-muted-foreground">{t('deliveries.removal.empty')}</div>
        ) : (
          requests.map((request) => {
            const decision = decisionWords(request, t, f)
            return (
              <div
                key={request.id}
                data-testid="removal-request-row"
                className="p-3 rounded-lg border border-border bg-card space-y-1"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-semibold">
                    {t('deliveries.removal.labelAndPay', {
                      label: removalLabelText(request, f.language),
                      pay: request.paidToRider ? t('deliveries.removal.paid') : t('deliveries.removal.notPaid'),
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground">{f.dateTime(request.createdAt)}</span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">{t('deliveries.removal.from')} </span>
                  <span className="font-medium">{request.courierName || request.courierId}</span>
                  <span className="text-muted-foreground">{` · ${enumLabel(t, 'removalRequestStatus', request.status)}`}</span>
                </div>
                {request.note ? <p className="text-xs whitespace-pre-wrap break-words">{request.note}</p> : null}
                {decision ? <p className="text-xs text-muted-foreground">{decision}</p> : null}
                {request.decisionNote ? (
                  <p className="text-xs whitespace-pre-wrap break-words">
                    <span className="text-muted-foreground">{t('deliveries.removal.dispatchAnswer')} </span>
                    {request.decisionNote}
                  </p>
                ) : null}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
