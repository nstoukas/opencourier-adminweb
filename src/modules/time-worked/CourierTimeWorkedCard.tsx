import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/admin-web-components'
import { useGetCourierTimeWorkedQuery } from '@/api/timeWorkedApi'
import type { EarningsFiguresDto, WorkedDayDto, WorkedJobDto, WorkedShiftDto } from '@/backend-admin-sdk'
import { athensToday } from '@/modules/dispatch-stop/dispatchStopDisplay'
import { enumLabel } from '@/i18n/enumLabel'
import { useFormat } from '@/i18n/useFormat'
import { DayRangeForm } from './DayRangeForm'
import {
  CAUSE_KEYS,
  DayRange,
  END_KEYS,
  RIDER_MAX_DAYS,
  addDays,
  dayAndTime,
  formatDay,
  formatDuration,
  formatKm,
  isUnderAMinute,
  jobMinutes,
  shiftTime,
} from './timeWorkedFormat'

// A label for a value the copy does not know yet (a new backend cause or end) falls back to the code,
// never "undefined". `t` comes from the component's useTranslation.
const causeLabel = (cause: string, t: TFunction) => {
  const key = (CAUSE_KEYS as Partial<Record<string, string>>)[cause]
  return key ? t(key) : cause
}
const endLabel = (label: string, t: TFunction) => {
  const key = (END_KEYS as Partial<Record<string, string>>)[label]
  return key ? t(key) : label
}

function Split({ job, wait, unpaid }: { job: number; wait: number; unpaid: number }) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  return (
    <p className="text-muted-foreground">
      {t('timeWorked.card.split', {
        jobs: formatDuration(job, t),
        wait: formatDuration(wait, t),
        unpaid: formatDuration(unpaid, t),
      })}
    </p>
  )
}

// Spec 0042 (AC-1, AC-15): the four figures of a day or a week, as the rider's Earnings screen shows
// them. Plain text: no colour, threshold or mark, and never a figure from another rider (AC-16).
function Figures({ figures, currencyCode }: { figures: EarningsFiguresDto; currencyCode: string }) {
  const { t } = useTranslation()
  // useFormat gives money in the reader's language.
  const f = useFormat()
  const money = (cents: number | null) => (cents === null ? t('common.dash') : f.money(cents, currencyCode))
  const wait =
    figures.medianPickupWaitSeconds === null
      ? t('common.dash')
      : t('timeWorked.card.wait', {
          minutes: Math.round(figures.medianPickupWaitSeconds / 60),
          count: figures.pickupWaitCount,
        })
  return (
    <>
      <p>
        {t('timeWorked.card.totals', {
          money: money(figures.moneyCents),
          count: figures.dropOffCount,
          duration: formatDuration(figures.workSeconds, t),
        })}
      </p>
      <p>
        {t('timeWorked.card.rates', {
          perHour: money(figures.centsPerHour),
          perActiveHour: money(figures.activeCentsPerHour),
          perKm: money(figures.centsPerPaidKm),
          wait,
        })}
      </p>
      <Split job={figures.jobSeconds} wait={figures.paidWaitSeconds} unpaid={figures.unpaidSeconds} />
      {figures.noJobMoneyCents > 0 ? (
        <p className="text-muted-foreground">
          {t('timeWorked.card.noJobMoney', { money: money(figures.noJobMoneyCents) })}
        </p>
      ) : null}
    </>
  )
}

// Spec 0042 (AC-8, AC-15): one job as the rider's list shows it, linked to the delivery's own admin page
// for its pay breakdown and events.
function JobRow({ job, currencyCode, inNoShift }: { job: WorkedJobDto; currencyCode: string; inNoShift: boolean }) {
  const { t } = useTranslation()
  const f = useFormat()
  const money = job.compensations.reduce((sum, c) => sum + c.amountCents, job.deliveryMoneyCents)
  // The parts after the destination, joined with " · ": distance, minutes, how it ended, out of shift.
  const parts = [
    job.paidKm === null ? t('common.dash') : formatKm(job.paidKm, f.language),
    t('timeWorked.duration.minutes', { minutes: jobMinutes(job) }),
    ...(job.endLabel ? [endLabel(job.endLabel, t)] : []),
    ...(inNoShift ? [t('timeWorked.card.notInShift')] : []),
  ]
  return (
    <li className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-medium tabular-nums">{f.time(job.acceptedAt)}</span>
      <Link href={`/deliveries/${job.deliveryId}`} className="underline underline-offset-2">
        {`${job.pickupName} → ${job.dropoffArea ?? t('common.dash')}`}
      </Link>
      <span className="text-muted-foreground">{parts.join(' · ')}</span>
      <span className="ml-auto tabular-nums">{f.money(money, currencyCode)}</span>
    </li>
  )
}

function ShiftItem({ shift }: { shift: WorkedShiftDto }) {
  const { t } = useTranslation()
  const f = useFormat()
  const money = (cents: number | null) => (cents === null ? t('common.dash') : f.money(cents, shift.currencyCode))
  // Every later time in the shift shows its date too when it falls on another Athens day than the
  // shift's start, so a long shift (a phone that died while Online, 36.18) reads clearly (review).
  const at = (iso: string) => shiftTime(f, shift.startedAt, iso)
  const times = t('timeWorked.card.shiftTimes', {
    start: dayAndTime(f, shift.startedAt),
    end: shift.endedAt ? at(shift.endedAt) : t('timeWorked.card.stillOpen'),
  })
  const onBreak = shift.onBreakSince ? ` ${t('timeWorked.card.onBreak', { time: at(shift.onBreakSince) })}` : ''
  return (
    <li className="rounded-md border border-border p-3">
      {shift.startedBeforeRange ? (
        <p className="text-xs text-muted-foreground">{t('timeWorked.card.startedBefore')}</p>
      ) : null}
      <p className="font-medium">
        {`${times}${onBreak} · ${formatDuration(shift.workSeconds, t)} · ${money(shift.moneyCents)} · ${t(
          'timeWorked.card.perHour',
          { money: money(shift.centsPerHour) },
        )}`}
      </p>
      <Split job={shift.jobSeconds} wait={shift.paidWaitSeconds} unpaid={shift.unpaidSeconds} />
      {shift.lateMoneyCents > 0 ? (
        <p className="text-muted-foreground">
          {t('timeWorked.card.addedLater', { money: money(shift.lateMoneyCents) })}
        </p>
      ) : null}
      {shift.breaks.map((b) => (
        <p key={b.startedAt} className="font-medium text-muted-foreground">
          {isUnderAMinute(b)
            ? t('timeWorked.card.breakShort', { time: at(b.startedAt) })
            : t('timeWorked.card.break', { start: at(b.startedAt), end: at(b.endedAt) })}
        </p>
      ))}
      <details className="mt-2">
        <summary className="cursor-pointer underline underline-offset-2">{t('timeWorked.card.records')}</summary>
        <h4 className="mt-2 font-medium">{t('timeWorked.card.statusChanges')}</h4>
        <ul>
          {shift.statusChanges.map((change) => (
            <li key={`${change.at}-${change.toStatus}`}>
              {t('timeWorked.card.statusChange', {
                time: at(change.at),
                from: enumLabel(t, 'courierStatus', change.fromStatus),
                to: enumLabel(t, 'courierStatus', change.toStatus),
                cause: causeLabel(change.cause, t),
              })}
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
  const { t } = useTranslation()
  const f = useFormat()
  return (
    <li className="border-t border-border pt-3">
      <h3 className="font-semibold">{formatDay(day.date, true, f.language)}</h3>
      <Figures figures={day} currencyCode={currencyCode} />
      {jobs.length > 0 ? (
        <>
          <h4 className="mt-2 font-medium">{t('timeWorked.card.jobsThisDay')}</h4>
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
  const { t } = useTranslation()
  const f = useFormat()
  const dayTitle = (day: string) => formatDay(day, true, f.language)
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
        <CardTitle className="text-lg">{t('timeWorked.page.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">{t('timeWorked.card.intro')}</p>
        <DayRangeForm idPrefix="courier-time-worked" value={range} maxDays={RIDER_MAX_DAYS} onChange={setRange} />
        {query.isLoading || (query.isFetching && !data) ? (
          <p className="text-muted-foreground">{t('common.loading')}</p>
        ) : query.isError ? (
          <p role="alert" className="text-destructive">
            {t('timeWorked.page.loadFailed')}
          </p>
        ) : data ? (
          <>
            <p className="text-muted-foreground">
              {data.recordedFrom
                ? t('timeWorked.card.recordedFrom', { day: dayTitle(athensToday(new Date(data.recordedFrom))) })
                : t('timeWorked.card.recordedFromToday')}
            </p>
            {shownDays.length === 0 && earlier.length === 0 ? (
              <p className="text-muted-foreground">{t('timeWorked.card.none')}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {weeks.map((week) => (
                  <li key={week.weekStart} className="pt-1">
                    <h3 className="font-semibold">
                      {t(week.soFar ? 'timeWorked.card.weekSoFar' : 'timeWorked.card.week', {
                        from: dayTitle(week.weekStart),
                        to: dayTitle(addDays(week.weekStart, 6)),
                      })}
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
                    <h3 className="font-semibold">{t('timeWorked.card.earlier')}</h3>
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
