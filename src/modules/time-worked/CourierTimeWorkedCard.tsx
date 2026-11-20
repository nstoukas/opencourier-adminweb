import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/admin-web-components'
import { useGetCourierTimeWorkedQuery } from '@/api/timeWorkedApi'
import type { EarningsFiguresDto, WorkedDayDto, WorkedJobDto, WorkedShiftDto } from '@/backend-admin-sdk'
import { athensDateTime, athensEnd, athensTime, athensToday } from '@/modules/dispatch-stop/dispatchStopDisplay'
import { formatMoney } from '@/utils/formatMoney'
import { DayRangeForm } from './DayRangeForm'
import {
  CAUSE_LABELS,
  DayRange,
  END_LABELS,
  RIDER_MAX_DAYS,
  STATUS_LABELS,
  addDays,
  formatDay,
  formatDuration,
  formatKm,
  isUnderAMinute,
  jobMinutes,
} from './timeWorkedFormat'

const dayTitle = (day: string) => formatDay(day)

// A label for a value the copy does not know yet (a new backend status or cause) falls back to the code.
const statusLabel = (status: string) => (STATUS_LABELS as Record<string, string>)[status] ?? status
const causeLabel = (cause: string) => (CAUSE_LABELS as Record<string, string>)[cause] ?? cause
// A label the server added before this copy knew it shows as its code, never "undefined".
const endLabel = (label: string) => (END_LABELS as Record<string, string>)[label] ?? label

function Split({ job, wait, unpaid }: { job: number; wait: number; unpaid: number }) {
  return (
    <p className="text-muted-foreground">
      Jobs {formatDuration(job)} · Paid waiting {formatDuration(wait)} · Unpaid {formatDuration(unpaid)}
    </p>
  )
}

// Spec 0042 (AC-1, AC-15): the four figures of a day or a week, as the rider's Earnings screen shows
// them. Plain text: no colour, threshold or mark, and never a figure from another rider (AC-16).
function Figures({ figures, currencyCode }: { figures: EarningsFiguresDto; currencyCode: string }) {
  const money = (cents: number | null) => (cents === null ? '—' : formatMoney(cents, currencyCode) ?? '—')
  const wait =
    figures.medianPickupWaitSeconds === null
      ? '—'
      : `${Math.round(figures.medianPickupWaitSeconds / 60)} min (${figures.pickupWaitCount} ${
          figures.pickupWaitCount === 1 ? 'wait' : 'waits'
        })`
  return (
    <>
      <p>
        {money(figures.moneyCents)} · {figures.dropOffCount} {figures.dropOffCount === 1 ? 'drop off' : 'drop offs'} ·{' '}
        {formatDuration(figures.workSeconds)} worked
      </p>
      <p>
        {money(figures.centsPerHour)} per hour worked · {money(figures.activeCentsPerHour)} per hour on a job ·{' '}
        {money(figures.centsPerPaidKm)} per paid km · typical pickup wait {wait}
      </p>
      <Split job={figures.jobSeconds} wait={figures.paidWaitSeconds} unpaid={figures.unpaidSeconds} />
      {figures.noJobMoneyCents > 0 ? (
        <p className="text-muted-foreground">{money(figures.noJobMoneyCents)} paid that is not linked to a job</p>
      ) : null}
    </>
  )
}

// Spec 0042 (AC-8, AC-15): one job as the rider's list shows it, linked to the delivery's own admin page
// for its pay breakdown and events.
function JobRow({ job, currencyCode, inNoShift }: { job: WorkedJobDto; currencyCode: string; inNoShift: boolean }) {
  const money = job.compensations.reduce((sum, c) => sum + c.amountCents, job.deliveryMoneyCents)
  return (
    <li className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-medium tabular-nums">{athensTime(job.acceptedAt)}</span>
      <Link href={`/deliveries/${job.deliveryId}`} className="underline underline-offset-2">
        {job.pickupName} → {job.dropoffArea ?? '—'}
      </Link>
      <span className="text-muted-foreground">
        {job.paidKm === null ? '—' : formatKm(job.paidKm)} · {jobMinutes(job)} min
        {job.endLabel ? ` · ${endLabel(job.endLabel)}` : ''}
        {inNoShift ? ' · not in a recorded shift' : ''}
      </span>
      <span className="ml-auto tabular-nums">{formatMoney(money, currencyCode) ?? '—'}</span>
    </li>
  )
}

function ShiftItem({ shift }: { shift: WorkedShiftDto }) {
  const money = (cents: number | null) => (cents === null ? '—' : formatMoney(cents, shift.currencyCode) ?? '—')
  // Every later time in the shift shows its date too when it falls on another Athens day than the
  // shift's start, so a long shift (a phone that died while Online, 36.18) reads clearly (review).
  const at = (iso: string) => athensEnd(shift.startedAt, iso)
  return (
    <li className="rounded-md border border-border p-3">
      {shift.startedBeforeRange ? <p className="text-xs text-muted-foreground">Started before these days</p> : null}
      <p className="font-medium">
        {athensDateTime(shift.startedAt)} to {shift.endedAt ? at(shift.endedAt) : 'still open'}
        {shift.onBreakSince ? ` (on a break since ${at(shift.onBreakSince)})` : ''}
        {' · '}
        {formatDuration(shift.workSeconds)} · {money(shift.moneyCents)} · {money(shift.centsPerHour)} per hour
      </p>
      <Split job={shift.jobSeconds} wait={shift.paidWaitSeconds} unpaid={shift.unpaidSeconds} />
      {shift.lateMoneyCents > 0 ? (
        <p className="text-muted-foreground">{money(shift.lateMoneyCents)} of it added later</p>
      ) : null}
      {shift.breaks.map((b) => (
        <p key={b.startedAt} className="font-medium text-muted-foreground">
          {isUnderAMinute(b)
            ? `Break at ${at(b.startedAt)}, under a minute`
            : `Break ${at(b.startedAt)} to ${at(b.endedAt)}`}
        </p>
      ))}
      <details className="mt-2">
        <summary className="cursor-pointer underline underline-offset-2">Records behind this shift</summary>
        <h4 className="mt-2 font-medium">Status changes</h4>
        <ul>
          {shift.statusChanges.map((change) => (
            <li key={`${change.at}-${change.toStatus}`}>
              {at(change.at)} {statusLabel(change.fromStatus)} to {statusLabel(change.toStatus)},{' '}
              {causeLabel(change.cause)}
              {change.adminLabel ? ` (${change.adminLabel})` : ''}
            </li>
          ))}
        </ul>
      </details>
    </li>
  )
}

function DayItem({
  day,
  shifts,
  jobs,
  currencyCode,
}: {
  day: WorkedDayDto
  shifts: WorkedShiftDto[]
  jobs: { job: WorkedJobDto; inNoShift: boolean }[]
  currencyCode: string
}) {
  return (
    <li className="border-t border-border pt-3">
      <h3 className="font-semibold">{dayTitle(day.date)}</h3>
      <Figures figures={day} currencyCode={currencyCode} />
      {jobs.length > 0 ? (
        <>
          <h4 className="mt-2 font-medium">Jobs accepted this day</h4>
          <ul className="flex flex-col gap-1">
            {jobs.map(({ job, inNoShift }) => (
              <JobRow
                key={`${job.deliveryId}-${job.acceptedAt}`}
                job={job}
                currencyCode={currencyCode}
                inNoShift={inNoShift}
              />
            ))}
          </ul>
        </>
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
// app, plus which admin made an admin caused change. Spec 0042 (AC-15) adds the Earnings figures for
// each week and day and each day's job rows, with no reach limit. It is here to answer the rider's questions and
// review requests (36.3, 36.8); nothing on this page compares it with another rider (AC-16).
// `pollingInterval` is the rider page's own (0 while the tab is hidden). The card polls with it only
// while its range includes today, since an open shift is the only thing that moves and each read costs
// several queries (review 2026-11-20, decision 36.49).
export function CourierTimeWorkedCard({
  courierId,
  pollingInterval = 0,
}: {
  courierId: string
  pollingInterval?: number
}) {
  const today = athensToday()
  const [range, setRange] = useState<DayRange>({
    from: addDays(today, -6),
    to: today,
  })
  const query = useGetCourierTimeWorkedQuery(
    { courierId, ...range },
    {
      skip: !courierId,
      pollingInterval: range.to >= today ? pollingInterval : 0,
    }
  )
  const data = query.currentData

  // Spec 0042 (AC-8): a day's job rows are the jobs accepted that Athens day, in or out of a shift,
  // ordered by accept time. Grouped once per answer (useMemo keeps the result until `data` changes), so
  // a 31 day range does not work out every job's Athens day again for each day on every render.
  const jobsByDay = useMemo(() => {
    const byDay: Record<string, { job: WorkedJobDto; inNoShift: boolean }[] | undefined> = {}
    const all = [
      ...(data?.shifts ?? []).flatMap((shift) => shift.jobs.map((job) => ({ job, inNoShift: false }))),
      ...(data?.jobsInNoShift ?? []).map((job) => ({ job, inNoShift: true })),
    ]
    for (const entry of all) {
      const day = athensToday(new Date(entry.job.acceptedAt))
      ;(byDay[day] ??= []).push(entry)
    }
    for (const entries of Object.values(byDay)) {
      entries?.sort((a, b) => a.job.acceptedAt.localeCompare(b.job.acceptedAt))
    }
    return byDay
  }, [data])
  const jobsOn = (date: string) => jobsByDay[date] ?? []

  // A day shows when it has work, money, or a job accepted on it (a job that earned nothing still gets
  // its row, AC-8).
  const shownDays = (data?.days ?? [])
    .filter((day) => day.workSeconds > 0 || day.moneyCents > 0 || jobsOn(day.date).length > 0)
    .reverse()
  // A shift is listed under the Athens day it started on; one that began before the first day shown is
  // the oldest, so it goes last, under its own heading.
  const shiftsOn = (date: string) =>
    (data?.shifts ?? []).filter((shift) => athensToday(new Date(shift.startedAt)) === date).reverse()
  const earlier = (data?.shifts ?? [])
    .filter((shift) => !shownDays.some((day) => day.date === athensToday(new Date(shift.startedAt))))
    .reverse()
  const weeks = [...(data?.weeks ?? [])].reverse()

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
                {weeks.map((week) => (
                  <li key={week.weekStart} className="pt-1">
                    <h3 className="font-semibold">
                      Week {formatDay(week.weekStart)} to {formatDay(addDays(week.weekStart, 6))}
                      {week.soFar ? ' (so far)' : ''}
                    </h3>
                    <Figures figures={week} currencyCode={data.currencyCode} />
                  </li>
                ))}
                {shownDays.map((day) => (
                  <DayItem
                    key={day.date}
                    day={day}
                    shifts={shiftsOn(day.date)}
                    jobs={jobsOn(day.date)}
                    currencyCode={data.currencyCode}
                  />
                ))}
                {earlier.length > 0 ? (
                  <li className="border-t border-border pt-3">
                    <h3 className="font-semibold">Began before these days</h3>
                    <ul className="mt-2 flex flex-col gap-2">
                      {earlier.map((s) => (
                        <ShiftItem key={s.startedAt} shift={s} />
                      ))}
                    </ul>
                  </li>
                ) : null}
              </ul>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
