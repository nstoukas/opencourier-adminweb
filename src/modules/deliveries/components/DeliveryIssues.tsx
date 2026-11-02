import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/admin-web-components'
import { formatDate } from '@/ui-shared-utils'
import { useGetDeliveryIssuesQuery } from '@/api/deliveriesApi'
import { usePageVisible } from '@/hooks/usePageVisible'
import { DELIVERY_ISSUE_REASON_TO_HUMAN } from '@/shared-types'

interface DeliveryIssuesProps {
  deliveryId: string
}

// The words for a reason; a reason this copy does not know yet is shown as sent.
function reasonWords(reason: string): string {
  return (DELIVERY_ISSUE_REASON_TO_HUMAN as Record<string, string | undefined>)[reason] ?? reason
}

// What riders reported about this one delivery from the app, oldest first (decision 66.11).
// Shown here only: nothing counts or groups reports by rider (value 5).
export function DeliveryIssues({ deliveryId }: DeliveryIssuesProps) {
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
        <CardTitle className="text-lg">Rider reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading ? (
          <div className="text-muted-foreground">Loading rider reports.</div>
        ) : isError || error ? (
          <div className="text-destructive">Could not load the rider reports.</div>
        ) : !issues || issues.length === 0 ? (
          <div className="text-muted-foreground">No rider has reported an issue with this delivery.</div>
        ) : (
          issues.map((issue) => (
            <div
              key={issue.id}
              data-testid="delivery-issue-row"
              className="p-3 rounded-lg border border-border bg-card space-y-1"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold">{reasonWords(issue.reason)}</span>
                <span className="text-xs text-muted-foreground">{formatDate(issue.createdAt)}</span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">From </span>
                <span className="font-medium">{issue.courierName || issue.courierId}</span>
              </div>
              {issue.note ? (
                <p className="text-xs whitespace-pre-wrap break-words">{issue.note}</p>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
