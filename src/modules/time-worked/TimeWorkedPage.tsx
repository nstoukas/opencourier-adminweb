import React from 'react'
import { useRouter } from 'next/router'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/admin-web-components'
import { useGetTimeWorkedTotalsQuery } from '@/api/timeWorkedApi'
import type { TimeWorkedTotalsBy } from '@/backend-admin-sdk'
import { PageHeader } from '@/components/layouts/PageHeader'
import { EAdminRoutes } from '@/hooks/useAdminPageNavigator'
import { formatMoney } from '@/utils/formatMoney'
import { DayRangeForm } from './DayRangeForm'
import {
  DayRange,
  TOTALS_MAX_DAYS,
  formatDay,
  formatDuration,
  formatShare,
  rangeFromQuery,
  weekPart,
} from './timeWorkedFormat'

// The default range: the last four weeks.
const DEFAULT_DAYS = 28

function periodLabel(period: string, by: TimeWorkedTotalsBy): string {
  const text = formatDay(period, by === 'day')
  return by === 'week' ? `Week of ${text}` : text
}

// Spec 0040, AC-14 and AC-16. The co-op's time worked, by day or by Monday week, over a chosen range:
// how many riders worked and how their hours split between jobs, paid waiting and unpaid time. Admins
// see every row whatever the rider count. No row names, counts or orders a rider.
export function TimeWorkedPage() {
  const router = useRouter()
  const { range, problem } = rangeFromQuery(router.query.from, router.query.to, TOTALS_MAX_DAYS, DEFAULT_DAYS)
  const by: TimeWorkedTotalsBy = router.query.by === 'week' ? 'week' : 'day'
  const query = useGetTimeWorkedTotalsQuery({ ...range, by }, { skip: !router.isReady })
  // currentData: a new range never shows the previous range's rows (adminweb AGENTS.md).
  const data = query.currentData
  const money = (cents: number | null) => (cents === null ? '—' : formatMoney(cents, data?.currencyCode) ?? '—')

  const go = (next: DayRange, nextBy: TimeWorkedTotalsBy) =>
    router.push({
      pathname: EAdminRoutes.TIME_WORKED,
      query: { from: next.from, to: next.to, by: nextBy },
    })

  return (
    <>
      <PageHeader
        title="Time worked"
        description="How the co-op's hours split between jobs, paid waiting and unpaid time, for the assembly. Totals only: no rider is named or compared."
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <DayRangeForm
          idPrefix="time-worked"
          value={range}
          maxDays={TOTALS_MAX_DAYS}
          onChange={(next) => go(next, by)}
        />
        <Tabs value={by} onValueChange={(value) => go(range, value === 'week' ? 'week' : 'day')}>
          <TabsList aria-label="Group by">
            <TabsTrigger value="day">By day</TabsTrigger>
            <TabsTrigger value="week">By week</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {problem ? (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {problem} Showing the last {DEFAULT_DAYS} days instead.
        </p>
      ) : null}

      {!router.isReady || query.isLoading || (query.isFetching && !data) ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load the time worked.
        </p>
      ) : !data || data.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No days in this range.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{by === 'week' ? 'Week' : 'Day'}</TableHead>
                <TableHead className="text-right">Riders who worked</TableHead>
                <TableHead className="text-right">Time worked</TableHead>
                <TableHead className="text-right">Jobs</TableHead>
                <TableHead className="text-right">Paid waiting</TableHead>
                <TableHead className="text-right">Unpaid</TableHead>
                <TableHead className="text-right">Unpaid share</TableHead>
                <TableHead className="text-right">Money</TableHead>
                <TableHead className="text-right">Not in a recorded shift</TableHead>
                <TableHead className="text-right">Per hour</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => {
                // A week cut by the range says so, or its few days would read like a bad week.
                const part = by === 'week' ? weekPart(row.period, range) : null
                return (
                  <TableRow key={row.period}>
                    <TableCell className="font-medium">
                      {periodLabel(row.period, by)}
                      {part ? <span className="block text-xs font-normal text-muted-foreground">{part}</span> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.riderCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(row.workSeconds)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(row.jobSeconds)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(row.paidWaitSeconds)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(row.unpaidSeconds)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatShare(row.unpaidSeconds, row.workSeconds)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.moneyCents)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.unlinkedMoneyCents)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.centsPerHour)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <p className="mt-4 text-sm text-muted-foreground">
            Money is what riders were paid for the jobs they accepted in the period, with pay added later. &quot;Not in
            a recorded shift&quot; is pay for work outside any recorded shift, mostly from before recording began; it is
            in Money but left out of the per hour figure. Each time is rounded down to the minute, so Jobs, Paid waiting
            and Unpaid can add up to a minute or two less than Time worked.
          </p>
        </>
      )}
    </>
  )
}
