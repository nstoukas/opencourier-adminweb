import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, Button, Card, CardContent, CardHeader, CardTitle } from '@/admin-web-components'
import type { ShiftOfflineEventAdminDto } from '@/backend-admin-sdk'
import { useFollowUpShiftOfflineEventMutation, useGetShiftOfflineEventsQuery } from '@/api/shiftOfflineEventApi'
import { usePageVisible } from '@/hooks/usePageVisible'

// Spec 0049 (AC-6, cross check 3): who went Offline during a booked shift, so a representative can check in
// with them in person. Newest first by the Offline time, open and followed up together; a followed up one
// stays for 7 days. Never
// grouped, counted, searched or sorted by rider (value 5): the rider learns nothing here costs them.
// The shift, the Offline time and the cause are the server's own text, shown as sent.
export function ShiftOfflineEventsCard() {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const visible = usePageVisible()
  const query = useGetShiftOfflineEventsQuery(undefined, { pollingInterval: visible ? 60_000 : 0 })
  const [followUp] = useFollowUpShiftOfflineEventMutation()
  const [busyId, setBusyId] = useState<string | null>(null)
  // A translation key, not words, so a language switch reaches a message already on screen.
  const [problem, setProblem] = useState<string | null>(null)

  const onFollowUp = async (event: ShiftOfflineEventAdminDto) => {
    setBusyId(event.id)
    setProblem(null)
    try {
      await followUp({ id: event.id }).unwrap()
    } catch (error) {
      const status = (error as { statusCode?: number } | undefined)?.statusCode
      setProblem(
        status === 409 ? 'shiftSlots.offline.conflict' : 'shiftSlots.offline.failed'
      )
    } finally {
      setBusyId(null)
    }
  }

  const events = query.data ?? []
  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t('shiftSlots.offline.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('shiftSlots.offline.description')}</p>
      </CardHeader>
      <CardContent>
        {problem ? (
          <Alert className="mb-3" role="alert">
            <AlertDescription>{t(problem)}</AlertDescription>
          </Alert>
        ) : null}
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : query.isError ? (
          <p className="text-sm text-destructive">{t('shiftSlots.offline.loadFailed')}</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('shiftSlots.offline.none')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="text-sm">
                  <p className="font-medium">{event.courierName}</p>
                  <p className="text-muted-foreground">
                    {t('shiftSlots.offline.line', {
                      shift: event.shiftText,
                      time: event.offlineTime ?? t('shiftSlots.offline.unknownTime'),
                      // The cause in the reader's language from its enum value, else the server's English.
                      cause: t(`shiftSlots.offline.cause.${event.cause ?? 'NONE'}`, { defaultValue: event.causeText }),
                    })}
                  </p>
                </div>
                {event.followedUpAt ? (
                  <p className="text-sm text-muted-foreground">
                    {event.followedUpByEmail
                      ? t('shiftSlots.offline.followedUpBy', { email: event.followedUpByEmail })
                      : t('shiftSlots.offline.followedUp')}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busyId !== null}
                    aria-label={t('shiftSlots.offline.markLabel', {
                      name: event.courierName,
                      time: event.offlineTime ?? t('shiftSlots.offline.unknownTime'),
                    })}
                    onClick={() => void onFollowUp(event)}
                  >
                    {busyId === event.id ? t('common.saving') : t('shiftSlots.offline.followedUp')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
