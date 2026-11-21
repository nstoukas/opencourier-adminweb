import React, { useState } from 'react'
import { Alert, AlertDescription, Button, Card, CardContent, CardHeader, CardTitle } from '@/admin-web-components'
import type { ShiftOfflineEventAdminDto } from '@/backend-admin-sdk'
import { useFollowUpShiftOfflineEventMutation, useGetShiftOfflineEventsQuery } from '@/api/shiftOfflineEventApi'
import { usePageVisible } from '@/hooks/usePageVisible'

// Spec 0049 (AC-6, cross check 3): who went Offline during a booked shift, so a representative can check in
// with them in person. Open items first by time, newest first; a followed up one stays for 7 days. Never
// grouped, counted, searched or sorted by rider (value 5): the rider learns nothing here costs them.
export function ShiftOfflineEventsCard() {
  const visible = usePageVisible()
  const query = useGetShiftOfflineEventsQuery(undefined, { pollingInterval: visible ? 60_000 : 0 })
  const [followUp] = useFollowUpShiftOfflineEventMutation()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const onFollowUp = async (event: ShiftOfflineEventAdminDto) => {
    setBusyId(event.id)
    setProblem(null)
    try {
      await followUp({ id: event.id }).unwrap()
    } catch (error) {
      const status = (error as { statusCode?: number } | undefined)?.statusCode
      setProblem(
        status === 409
          ? 'Another admin followed this up first. The list is up to date now.'
          : 'Could not save the follow up. Try again.'
      )
    } finally {
      setBusyId(null)
    }
  }

  const events = query.data ?? []
  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Offline during a booked shift</CardTitle>
        <p className="text-sm text-muted-foreground">
          A rider who stayed Offline past the break limit during their booked shift. Check in with them in person;
          nothing here changes their offers or pay, and the rider sees the same record.
        </p>
      </CardHeader>
      <CardContent>
        {problem ? (
          <Alert className="mb-3" role="alert">
            <AlertDescription>{problem}</AlertDescription>
          </Alert>
        ) : null}
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : query.isError ? (
          <p className="text-sm text-destructive">Could not load this list.</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to follow up.</p>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="text-sm">
                  <p className="font-medium">{event.courierName}</p>
                  <p className="text-muted-foreground">
                    Shift {event.shiftText} · Offline at {event.offlineTime ?? 'an unknown time'} · {event.causeText}
                  </p>
                </div>
                {event.followedUpAt ? (
                  <p className="text-sm text-muted-foreground">
                    Followed up{event.followedUpByEmail ? ` by ${event.followedUpByEmail}` : ''}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busyId !== null}
                    aria-label={`Mark followed up: ${event.courierName}, Offline at ${event.offlineTime ?? 'an unknown time'}`}
                    onClick={() => void onFollowUp(event)}
                  >
                    {busyId === event.id ? 'Saving…' : 'Followed up'}
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
