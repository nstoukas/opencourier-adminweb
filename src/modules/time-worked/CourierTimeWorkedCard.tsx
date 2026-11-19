import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/admin-web-components'
import { useGetCourierTimeWorkedQuery } from '@/api/timeWorkedApi'
import type { WorkedDayDto, WorkedShiftDto } from '@/backend-admin-sdk'
import { athensDateTime, athensTime, athensToday } from '@/modules/dispatch-stop/dispatchStopDisplay'
import { formatMoney } from '@/utils/formatMoney'
import { DayRangeForm } from './DayRangeForm'
import {
  CAUSE_LABELS,
  COMPENSATION_LABELS,
  DayRange,
  JOB_END_LABELS,
  RIDER_MAX_DAYS,
  STATUS_LABELS,
  addDays,
  formatDuration,
} from './timeWorkedFormat'

function dayTitle(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function Split({ job, wait, unpaid }: { job: number; wait: number; unpaid: number }) {
  return (
    <p className="text-muted-foreground">
      Jobs {formatDuration(job)} · Paid waiting {formatDuration(wait)} · Unpaid {formatDuration(unpaid)}
    </p>
  )
}

function ShiftItem({ shift }: { shift: WorkedShiftDto }) {
  const money = (cents: number | null) => (cents === null ? '—' : formatMoney(cents, shift.currencyCode) ?? '—')
  return (
    <li className="rounded-md border border-border p-3">
      {shift.startedBeforeRange ? <p className="text-xs text-muted-foreground">Started before these days</p> : null}
      <p className="font-medium">
        {athensDateTime(shift.startedAt)} to {shift.endedAt ? athensTime(shift.endedAt) : 'still open'}
        {shift.onBreakSince ? ` (on a break since ${athensTime(shift.onBreakSince)})` : ''}
        {' · '}
        {formatDuration(shift.workSeconds)} · {money(shift.moneyCents)} · {money(shift.centsPerHour)} per hour
      </p>
      <Split job={shift.jobSeconds} wait={shift.paidWaitSeconds} unpaid={shift.unpaidSeconds} />
      {shift.lateMoneyCents > 0 ? (
        <p className="text-muted-foreground">{money(shift.lateMoneyCents)} of it added later</p>
      ) : null}
      {shift.breaks.map((b) => (
        <p key={b.startedAt} className="font-medium text-muted-foreground">
          Break {athensTime(b.startedAt)} to {athensTime(b.endedAt)}
        </p>
      ))}
      <details className="mt-2">
        <summary className="cursor-pointer underline underline-offset-2">Records behind this shift</summary>
        <h4 className="mt-2 font-medium">Status changes</h4>
        <ul>
          {shift.statusChanges.map((change) => (
            <li key={`${change.at}-${change.toStatus}`}>
              {athensTime(change.at)} {STATUS_LABELS[change.fromStatus]} to {STATUS_LABELS[change.toStatus]},{' '}
              {CAUSE_LABELS[change.cause]}
              {change.adminLabel ? ` (${change.adminLabel})` : ''}
            </li>
          ))}
        </ul>
        {shift.jobs.length > 0 ? (
          <>
            <h4 className="mt-2 font-medium">Jobs</h4>
            <ul>
              {shift.jobs.map((job) => (
                <li key={`${job.deliveryId}-${job.acceptedAt}`} className="mt-1">
                  {athensTime(job.acceptedAt)} to{' '}
                  {job.endedAt
                    ? `${athensTime(job.endedAt)}, ${JOB_END_LABELS[job.endEventType ?? ''] ?? 'ended'}`
                    : 'still held'}{' '}
                  · {job.pickupName} · <span className="font-mono text-xs">{job.deliveryId}</span>
                  <br />
                  {job.droppedOff ? `Delivery pay ${money(job.deliveryMoneyCents)}` : 'Not delivered by this rider'}
                  {job.compensations.map((c) => (
                    <React.Fragment key={c.id}>
                      <br />
                      {COMPENSATION_LABELS[c.reason] ?? c.reason} {money(c.amountCents)}
                      {c.addedLater ? `, added ${athensDateTime(c.createdAt)}` : ''}
                    </React.Fragment>
                  ))}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </details>
    </li>
  )
}

function DayItem({ day, shifts, currencyCode }: { day: WorkedDayDto; shifts: WorkedShiftDto[]; currencyCode: string }) {
  const money = (cents: number | null) => (cents === null ? '—' : formatMoney(cents, currencyCode) ?? '—')
  return (
    <li className="border-t border-border pt-3">
      <h3 className="font-semibold">{dayTitle(day.date)}</h3>
      <p>
        {formatDuration(day.workSeconds)} worked · {money(day.moneyCents - day.unlinkedMoneyCents)} ·{' '}
        {money(day.centsPerHour)} per hour
      </p>
      <Split job={day.jobSeconds} wait={day.paidWaitSeconds} unpaid={day.unpaidSeconds} />
      {day.unlinkedMoneyCents > 0 ? (
        <p className="text-muted-foreground">{money(day.unlinkedMoneyCents)} paid for work before recording began</p>
      ) : null}
      {shifts.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-2">
          {shifts.map((s) => (
            <ShiftItem key={s.startedAt} shift={s} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

// Spec 0040, AC-15: this rider's time worked, the same days, shifts and records the rider sees in the
// app, plus which admin made an admin caused change. It is here to answer the rider's questions and
// review requests (36.3, 36.8); nothing on this page compares it with another rider (AC-16).
export function CourierTimeWorkedCard({ courierId }: { courierId: string }) {
  const today = athensToday()
  const [range, setRange] = useState<DayRange>({
    from: addDays(today, -6),
    to: today,
  })
  const query = useGetCourierTimeWorkedQuery({ courierId, ...range }, { skip: !courierId })
  const data = query.currentData

  const shownDays = (data?.days ?? []).filter((day) => day.workSeconds > 0 || day.moneyCents > 0).reverse()
  // A shift is listed under the Athens day it started on; one that began before the range comes first.
  const shiftsOn = (date: string) =>
    (data?.shifts ?? []).filter((shift) => athensToday(new Date(shift.startedAt)) === date).reverse()
  const earlier = (data?.shifts ?? []).filter(
    (shift) => !shownDays.some((day) => day.date === athensToday(new Date(shift.startedAt)))
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Time worked</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">
          The same figures the rider sees in the app, to answer their questions and review requests.
        </p>
        <DayRangeForm idPrefix="courier-time-worked" value={range} maxDays={RIDER_MAX_DAYS} onChange={setRange} />
        {query.isLoading || (query.isFetching && !data) ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : query.isError ? (
          <p role="alert" className="text-destructive">
            Could not load the time worked.
          </p>
        ) : data ? (
          <>
            <p className="text-muted-foreground">
              Time worked is recorded from{' '}
              {data.recordedFrom ? dayTitle(athensToday(new Date(data.recordedFrom))) : 'today'}.
            </p>
            {shownDays.length === 0 && earlier.length === 0 ? (
              <p className="text-muted-foreground">No time worked in these days.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {earlier.length > 0 ? (
                  <li>
                    <ul className="flex flex-col gap-2">
                      {earlier.map((s) => (
                        <ShiftItem key={s.startedAt} shift={s} />
                      ))}
                    </ul>
                  </li>
                ) : null}
                {shownDays.map((day) => (
                  <DayItem key={day.date} day={day} shifts={shiftsOn(day.date)} currencyCode={data.currencyCode} />
                ))}
              </ul>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
