import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/admin-web-components'
import { formatDate } from '@/ui-shared-utils'
import { useGetDeliveryEventsQuery } from '@/api/deliveriesApi'
import { humanizeEventType, describeTransition } from '@/utils/deliveryEventDisplay'

interface DeliveryEventTimelineProps {
  deliveryId: string
}

// Renders the recorded DeliveryEvent history of a delivery, oldest first.
export function DeliveryEventTimeline({ deliveryId }: DeliveryEventTimelineProps) {
  const { data: events, isLoading, isError, error } = useGetDeliveryEventsQuery(
    { deliveryId },
    { skip: !deliveryId }
  )

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Delivery events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {isLoading ? (
          <div className="text-muted-foreground">Loading delivery events.</div>
        ) : isError || error ? (
          <div className="text-destructive">Could not load the event history.</div>
        ) : !events || events.length === 0 ? (
          <div className="text-muted-foreground">No DeliveryEvents recorded for this Delivery.</div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const isFailed = event.transitionSuccessful === false

              return (
                <div
                  key={event.id}
                  data-testid="delivery-event-row"
                  className={`p-3 rounded-lg border text-sm space-y-2 ${
                    isFailed
                      ? 'border-destructive/40 bg-destructive/5'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{humanizeEventType(event.type)}</span>
                      {isFailed && (
                        <Badge variant="destructive">Did not take effect</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(event.createdAt)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Actor & Source</span>
                      <span className="font-medium">
                        {event.actor} · {event.eventSource}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block">Transition</span>
                      <span className="font-medium">{describeTransition(event)}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground block">Message</span>
                    <p className="text-xs whitespace-pre-wrap break-words mt-0.5">
                      {event.message ?? '—'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Only describe the list when there is a list; saying "oldest first" beside a
            load error would claim we retrieved something we did not. */}
        {!isLoading && !isError && !error && events && events.length > 0 ? (
          <div className="border-t pt-3 text-xs text-muted-foreground">
            Recorded DeliveryEvents, oldest first. An event the state machine rejects outright is never written, so it cannot appear here.
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
