import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/admin-web-components'
import { formatDate } from '@/ui-shared-utils'
import { useGetDeliveryRemovalRequestsQuery } from '@/api/removalRequestApi'
import { usePageVisible } from '@/hooks/usePageVisible'
import { EnumRemovalRequestStatus, REMOVAL_REQUEST_STATUS_TO_HUMAN } from '@/shared-types'
import { athensTime } from '@/modules/dispatch-stop/dispatchStopDisplay'
import type { RemovalRequestAdminDto } from '@/backend-admin-sdk'

// The words for a status; a status this copy does not know yet is shown as sent.
function statusWords(status: string): string {
  return (REMOVAL_REQUEST_STATUS_TO_HUMAN as Record<string, string | undefined>)[status] ?? status
}

// Who answered, and when. Only an admin's answer has one: a withdrawn or closed request was decided by nobody.
function decisionWords(request: RemovalRequestAdminDto): string | null {
  const answered =
    request.status === EnumRemovalRequestStatus.APPROVED || request.status === EnumRemovalRequestStatus.DECLINED
  if (!answered || !request.decidedAt) return null
  const who = request.decidedBy?.username || request.decidedBy?.email || 'an admin'
  const verb = request.status === EnumRemovalRequestStatus.APPROVED ? 'Approved' : 'Declined'
  return `${verb} by ${who} at ${athensTime(request.decidedAt)}`
}

// This delivery's requests to take a rider off it, newest first (spec 0035, AC-24).
// Shown here only: nothing counts or groups a rider's requests (value 5).
export function DeliveryRemovalRequests({ deliveryId }: { deliveryId: string }) {
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
        <CardTitle className="text-lg">Removal requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isError ? (
          <div className="text-destructive">Could not load the removal requests.</div>
        ) : requests === undefined ? (
          <div className="text-muted-foreground">Loading removal requests.</div>
        ) : requests.length === 0 ? (
          <div className="text-muted-foreground">No rider has asked to come off this delivery.</div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              data-testid="removal-request-row"
              className="p-3 rounded-lg border border-border bg-card space-y-1"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold">
                  {request.label} ({request.paidToRider ? 'Paid' : 'Not paid'})
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">From </span>
                <span className="font-medium">{request.courierName || request.courierId}</span>
                <span className="text-muted-foreground"> · {statusWords(request.status)}</span>
              </div>
              {request.note ? <p className="text-xs whitespace-pre-wrap break-words">{request.note}</p> : null}
              {decisionWords(request) ? (
                <p className="text-xs text-muted-foreground">{decisionWords(request)}</p>
              ) : null}
              {request.decisionNote ? (
                <p className="text-xs whitespace-pre-wrap break-words">
                  <span className="text-muted-foreground">Dispatch&apos;s answer: </span>
                  {request.decisionNote}
                </p>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
