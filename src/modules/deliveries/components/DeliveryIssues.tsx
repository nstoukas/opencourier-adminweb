import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/admin-web-components'
import { useGetDeliveryIssuesQuery } from '@/api/deliveriesApi'
import { usePageVisible } from '@/hooks/usePageVisible'
import { enumLabel } from '@/i18n/enumLabel'
import { useFormat } from '@/i18n/useFormat'

interface DeliveryIssuesProps {
  deliveryId: string
}

// What riders reported about this one delivery from the app, oldest first (decision 66.11).
// Shown here only: nothing counts or groups reports by rider (value 5).
export function DeliveryIssues({ deliveryId }: DeliveryIssuesProps) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // Dates and times on Athens time, in the reader's language (spec 0054, AC-3).
  const f = useFormat()
  // Polled every 30 s like the event history, so a report sent while the page is open appears
  // without a reload; not while the tab is in the background (0 means no polling).
  const pageVisible = usePageVisible()
  const issuesQuery = useGetDeliveryIssuesQuery(
    { deliveryId },
    { skip: !deliveryId, pollingInterval: pageVisible ? 30_000 : 0 }
  )
  const { data: issues, isLoading, isError } = issuesQuery
  // Typed `unknown` for the same reason as in DeliveryEventTimeline: the base query's
  // `@ts-expect-error` makes TypeScript think `error` can never hold a value.
  const error: unknown = issuesQuery.error

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('deliveries.issues.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading ? (
          <div className="text-muted-foreground">{t('deliveries.issues.loading')}</div>
        ) : isError || error ? (
          <div className="text-destructive">{t('deliveries.issues.loadFailed')}</div>
        ) : !issues || issues.length === 0 ? (
          <div className="text-muted-foreground">{t('deliveries.issues.empty')}</div>
        ) : (
          issues.map((issue) => (
            <div
              key={issue.id}
              data-testid="delivery-issue-row"
              className="p-3 rounded-lg border border-border bg-card space-y-1"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold">{enumLabel(t, 'deliveryIssueReason', issue.reason)}</span>
                <span className="text-xs text-muted-foreground">{f.dateTime(issue.createdAt)}</span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">{t('deliveries.removal.from')} </span>
                <span className="font-medium">{issue.courierName || issue.courierId}</span>
              </div>
              {issue.note ? (
                <p className="text-xs whitespace-pre-wrap break-words">{issue.note}</p>
              ) : null}
              {issue.handledAt ? (
                <p className="text-xs text-muted-foreground">
                  {t('deliveries.issues.handledBy', {
                    who: issue.handledBy?.username || issue.handledBy?.email || t('deliveries.removal.anAdmin'),
                    // "at 13:05", with the right Greek word for "at" at one o'clock.
                    at: f.atTime(issue.handledAt),
                  })}
                </p>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
