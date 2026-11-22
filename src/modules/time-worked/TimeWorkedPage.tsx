import React from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
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
import { useFormat } from '@/i18n/useFormat'
import { showMessage } from '@/i18n/shownMessage'
import type { Language } from '@/i18n/language'
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

function periodLabel(period: string, by: TimeWorkedTotalsBy, t: TFunction, language: Language): string {
  const text = formatDay(period, by === 'day', language)
  return by === 'week' ? t('timeWorked.page.weekOf', { date: text }) : text
}

// Spec 0040, AC-14 and AC-16. The co-op's time worked, by day or by Monday week, over a chosen range:
// how many riders worked and how their hours split between jobs, paid waiting and unpaid time. Admins
// see every row whatever the rider count. No row names, counts or orders a rider.
export function TimeWorkedPage() {
  // useTranslation gives t, which looks a key up in the reader's language; useFormat gives money in it.
  const { t } = useTranslation()
  const f = useFormat()
  const router = useRouter()
  const { range, problem } = rangeFromQuery(router.query.from, router.query.to, TOTALS_MAX_DAYS, DEFAULT_DAYS)
  const by: TimeWorkedTotalsBy = router.query.by === 'week' ? 'week' : 'day'
  const query = useGetTimeWorkedTotalsQuery({ ...range, by }, { skip: !router.isReady })
  // currentData: a new range never shows the previous range's rows (adminweb AGENTS.md).
  const data = query.currentData
  const money = (cents: number | null) => (cents === null ? t('common.dash') : f.money(cents, data?.currencyCode))

  const go = (next: DayRange, nextBy: TimeWorkedTotalsBy) =>
    router.push({
      pathname: EAdminRoutes.TIME_WORKED,
      query: { from: next.from, to: next.to, by: nextBy },
    })

  return (
    <>
      <PageHeader
        title={t('timeWorked.page.title')}
        description={t('timeWorked.page.description')}
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <DayRangeForm
          idPrefix="time-worked"
          value={range}
          maxDays={TOTALS_MAX_DAYS}
          onChange={(next) => go(next, by)}
        />
        <Tabs value={by} onValueChange={(value) => go(range, value === 'week' ? 'week' : 'day')}>
          <TabsList aria-label={t('timeWorked.page.groupBy')}>
            <TabsTrigger value="day">{t('timeWorked.page.byDay')}</TabsTrigger>
            <TabsTrigger value="week">{t('timeWorked.page.byWeek')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {problem ? (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {`${showMessage(problem, t)} ${t('timeWorked.page.showingLast', { days: DEFAULT_DAYS })}`}
        </p>
      ) : null}

      {!router.isReady || query.isLoading || (query.isFetching && !data) ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t('timeWorked.page.loadFailed')}
        </p>
      ) : !data || data.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('timeWorked.page.noDays')}</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{by === 'week' ? t('timeWorked.page.week') : t('timeWorked.page.day')}</TableHead>
                <TableHead className="text-right">{t('timeWorked.page.riders')}</TableHead>
                <TableHead className="text-right">{t('timeWorked.page.timeWorked')}</TableHead>
                <TableHead className="text-right">{t('timeWorked.page.jobs')}</TableHead>
                <TableHead className="text-right">{t('timeWorked.page.paidWaiting')}</TableHead>
                <TableHead className="text-right">{t('timeWorked.page.unpaid')}</TableHead>
                <TableHead className="text-right">{t('timeWorked.page.unpaidShare')}</TableHead>
                <TableHead className="text-right">{t('timeWorked.page.money')}</TableHead>
                <TableHead className="text-right">{t('timeWorked.page.notInShift')}</TableHead>
                <TableHead className="text-right">{t('timeWorked.page.perHour')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => {
                // A week cut by the range says so, or its few days would read like a bad week.
                const part = by === 'week' ? weekPart(row.period, range, t, f.language) : null
                return (
                  <TableRow key={row.period}>
                    <TableCell className="font-medium">
                      {periodLabel(row.period, by, t, f.language)}
                      {part ? <span className="block text-xs font-normal text-muted-foreground">{part}</span> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.riderCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(row.workSeconds, t)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(row.jobSeconds, t)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(row.paidWaitSeconds, t)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(row.unpaidSeconds, t)}</TableCell>
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
          <p className="mt-4 text-sm text-muted-foreground">{t('timeWorked.page.footnote')}</p>
        </>
      )}
    </>
  )
}
