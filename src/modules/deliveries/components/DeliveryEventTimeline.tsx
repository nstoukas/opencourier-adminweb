import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/admin-web-components'
import { useGetDeliveryEventsQuery } from '@/api/deliveriesApi'
import { usePageVisible } from '@/hooks/usePageVisible'
import { eventTypeLabel, describeTransition, lateStepOf } from '@/utils/deliveryEventDisplay'
import { enumLabel } from '@/i18n/enumLabel'
import { useFormat } from '@/i18n/useFormat'
import { useServerText } from '@/i18n/useServerText'

interface DeliveryEventTimelineProps {
  deliveryId: string
  // Rider names by id, to name the rider an OFFERED or OFFER_EXPIRED event is about. Optional:
  // without it (or for a rider not in it) the timeline shows the rider's id instead.
  courierNameById?: Map<string, string>
}

// Renders the recorded DeliveryEvent history of a delivery, oldest first.
export function DeliveryEventTimeline({ deliveryId, courierNameById }: DeliveryEventTimelineProps) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // Dates and times on Athens time, in the reader's language (spec 0054, AC-3).
  const f = useFormat()
  // eventText words each record line in the reader's language from its code (AC-4).
  const { eventText } = useServerText()
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
        <CardTitle className="text-lg">{t('deliveries.timeline.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {isLoading ? (
          <div className="text-muted-foreground">{t('deliveries.timeline.loading')}</div>
        ) : isError || error ? (
          <div className="text-destructive">{t('deliveries.timeline.loadFailed')}</div>
        ) : !events || events.length === 0 ? (
          <div className="text-muted-foreground">{t('deliveries.timeline.empty')}</div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const isFailed = event.transitionSuccessful === false
              // A step a rider sent late from a dead spot (spec 0011, AC-4): shown at the time it
              // happened, with when it arrived under it.
              const late = lateStepOf(event)
              // The same day on Athens time, where the times are shown.
              const sameDay = late !== null && f.date(late.occurredAt) === f.date(late.arrivedAt)
              // "Not applied" only for the backend's no transition path (decision 20.13), which is
              // the one failed row stored without a new status; a late step that failed for another
              // reason keeps "Did not take effect" and its message (row 88 review).
              const notApplied = isFailed && late !== null && !event.newStatus
              // The line in the reader's language, or the stored English of an older row (AC-4).
              const message = eventText(event)

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
                      <span className="font-semibold">{eventTypeLabel(t, event.type)}</span>
                      {notApplied && (
                        <Badge variant="destructive">{t('deliveries.timeline.notApplied')}</Badge>
                      )}
                      {isFailed && !notApplied && <Badge variant="destructive">{t('deliveries.timeline.didNotTakeEffect')}</Badge>}
                    </div>
                    <span className="text-right text-xs text-muted-foreground">
                      {f.dateTime(late ? late.occurredAt : event.createdAt)}
                      {late && (
                        <span data-testid="late-step" className="block text-warning-foreground">
                          {t('deliveries.timeline.arrived', {
                            time: sameDay ? f.time(late.arrivedAt) : f.dateTime(late.arrivedAt),
                            count: late.minutesLater,
                          })}
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block">{t('deliveries.timeline.actorAndSource')}</span>
                      <span className="font-medium">
                        {`${enumLabel(t, 'eventActor', event.actor)} · ${enumLabel(t, 'eventSource', event.eventSource)}`}
                      </span>
                    </div>

                    {/* Only OFFERED and OFFER_EXPIRED name a rider: the one this offer went to, on
                        this delivery's own timeline. Never a count per rider (value 5). */}
                    {event.courierId ? (
                      <div>
                        <span className="text-muted-foreground block">{t('deliveries.timeline.rider')}</span>
                        {courierNameById?.get(event.courierId) ? (
                          <span className="font-medium">{courierNameById.get(event.courierId)}</span>
                        ) : (
                          <span className="font-mono break-all">{event.courierId}</span>
                        )}
                      </div>
                    ) : null}

                    <div>
                      <span className="text-muted-foreground block">{t('deliveries.timeline.transition')}</span>
                      <span className="font-medium">{describeTransition(event, t)}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground block">{t('deliveries.timeline.message')}</span>
                    <p className="text-xs whitespace-pre-wrap break-words mt-0.5">
                      {message.recordedInEnglish ? (
                        <>
                          {/* lang="en": the stored English is read out in English by a screen reader. */}
                          <span lang="en">{message.text}</span>{' '}
                          <span className="text-xs text-muted-foreground">({t('common.recordedInEnglish')})</span>
                        </>
                      ) : (
                        (message.text ?? t('common.dash'))
                      )}
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
            {t('deliveries.timeline.footnote')}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
