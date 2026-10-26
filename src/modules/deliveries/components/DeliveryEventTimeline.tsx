import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/admin-web-components'
import { formatDate } from '@/ui-shared-utils'
import { useGetDeliveryEventsQuery } from '@/api/deliveriesApi'
import { usePageVisible } from '@/hooks/usePageVisible'
import { humanizeEventType, describeTransition } from '@/utils/deliveryEventDisplay'
import { EVENT_ACTOR_TO_HUMAN, EVENT_SOURCE_TO_HUMAN } from '@/shared-types'

interface DeliveryEventTimelineProps {
  deliveryId: string
  // Rider names by id, to name the rider an OFFERED or OFFER_EXPIRED event is about. Optional:
  // without it (or for a rider not in it) the timeline shows the rider's id instead.
  courierNameById?: Map<string, string>
}

// The words for an actor or a source; a value this copy does not know yet is shown as sent.
// `Record<string, string | undefined>` lets us look up any string and get undefined back.
function wordsFor(table: Record<string, string | undefined>, value: string): string {
  return table[value] ?? value
}

// Renders the recorded DeliveryEvent history of a delivery, oldest first.
export function DeliveryEventTimeline({ deliveryId, courierNameById }: DeliveryEventTimelineProps) {
  // Polled every 30 s like the delivery above it, so a new OFFERED, OFFER_EXPIRED or
  // NO_COURIER_AVAILABLE row appears without a reload.
  // Not while the tab is in the background (0 means no polling), like the list.
  const pageVisible = usePageVisible()
  const eventsQuery = useGetDeliveryEventsQuery(
    { deliveryId },
    { skip: !deliveryId, pollingInterval: pageVisible ? 30_000 : 0 }
  )
  const { data: events, isLoading, isError } = eventsQuery
  // Typed `unknown` deliberately. The base query is declared through a `@ts-expect-error`
  // (src/api/index.ts:7), which leaves this inferred as a type that can never hold a value —
  // so TypeScript reads the `error` checks below as dead code. At runtime RTK Query really
  // does put the rejected request's ApiError here.
  const error: unknown = eventsQuery.error

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
                        {wordsFor(EVENT_ACTOR_TO_HUMAN, event.actor)} · {wordsFor(EVENT_SOURCE_TO_HUMAN, event.eventSource)}
                      </span>
                    </div>

                    {/* Only OFFERED and OFFER_EXPIRED name a rider: the one this offer went to, on
                        this delivery's own timeline. Never a count per rider (value 5). */}
                    {event.courierId ? (
                      <div>
                        <span className="text-muted-foreground block">Rider</span>
                        {courierNameById?.get(event.courierId) ? (
                          <span className="font-medium">{courierNameById.get(event.courierId)}</span>
                        ) : (
                          <span className="font-mono break-all">{event.courierId}</span>
                        )}
                      </div>
                    ) : null}

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
