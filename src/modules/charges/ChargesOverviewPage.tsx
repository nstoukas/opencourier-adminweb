import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { CaretLeft, CaretRight, DownloadSimple } from '@phosphor-icons/react'
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/admin-web-components'
import { useGetPartnerChargeMonthQuery } from '@/api/partnerChargeApi'
import { PageHeader } from '@/components/layouts/PageHeader'
import { EAdminRoutes } from '@/hooks/useAdminPageNavigator'
import { toLanguage } from '@/i18n/language'
import { FIRST_MONTH, currentAthensMonth, isMonth, monthTitle, shiftMonth } from '@/utils/athensMonth'
import { buildChargesCsv, downloadCsv } from './chargesCsv'
import { formatTotals } from './chargeTotals'
import { DELIVERY_FEE_NOTE_KEY } from './chargeWording'

// The month a Charges page shows: `?month=YYYY-MM`, else this month in Athens.
export function useChargesMonth(): { month: string; ready: boolean } {
  const router = useRouter()
  const fromUrl = router.query.month
  return { month: isMonth(fromUrl) ? fromUrl : currentAthensMonth(), ready: router.isReady }
}

// Spec 0036, AC-1, AC-4, AC-10. Every restaurant with a charge in the month, with what it was
// charged, what is billed and what is not, most unbilled first (the server's order). Charges are
// what a restaurant owes the co-op for cancellations, waits and removals: never a delivery fee.
export function ChargesOverviewPage() {
  const router = useRouter()
  // useTranslation gives t, which looks a key up in the reader's language, and i18n, which says which
  // language that is (month names and money follow it).
  const { t, i18n } = useTranslation()
  const language = toLanguage(i18n.language)
  // The CSV is a Greek document whatever the reader's language (spec 0054, cross check 11).
  const tGreek = i18n.getFixedT('el')
  const { month, ready } = useChargesMonth()
  const query = useGetPartnerChargeMonthQuery({ month }, { skip: !ready })
  // currentData: switching months never shows the previous month's rows (adminweb AGENTS.md).
  const data = query.currentData
  const title = monthTitle(month, language)

  const goToMonth = (next: string) => router.push({ pathname: EAdminRoutes.CHARGES, query: { month: next } })

  return (
    <>
      <PageHeader
        title={t('charges.title')}
        description={t('charges.overview.description')}
        action={
          <Button
            type="button"
            variant="outline"
            disabled={!data || data.charges.length === 0}
            onClick={() => data && downloadCsv(`charges-${month}.csv`, buildChargesCsv(tGreek, data.charges))}
          >
            <DownloadSimple aria-hidden="true" className="mr-2 h-4 w-4" />
            {t('charges.downloadCsv')}
          </Button>
        }
      />

      <nav aria-label={t('charges.overview.monthNav')} className="mb-4 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={month <= FIRST_MONTH}
          onClick={() => goToMonth(shiftMonth(month, -1))}
        >
          <CaretLeft aria-hidden="true" className="mr-1 h-4 w-4" />
          {t('charges.previous')}
        </Button>
        <h2 className="min-w-[10rem] text-center text-lg font-semibold" aria-live="polite">
          {title}
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={() => goToMonth(shiftMonth(month, 1))}>
          {t('charges.next')}
          <CaretRight aria-hidden="true" className="ml-1 h-4 w-4" />
        </Button>
      </nav>

      {data && data.earlierUnbilled.length > 0 ? (
        <p className="mb-4 text-sm">
          {t('charges.overview.earlierUnbilled', { count: earlierCount(data.earlierUnbilled) })}{' '}
          {data.earlierUnbilled.map((earlier, index) => (
            <React.Fragment key={earlier.month}>
              {index > 0 ? ', ' : null}
              <Link
                className="underline underline-offset-2"
                href={{ pathname: EAdminRoutes.CHARGES, query: { month: earlier.month } }}
              >
                {monthTitle(earlier.month, language)}
              </Link>
            </React.Fragment>
          ))}
        </p>
      ) : null}

      {!ready || query.isLoading || (query.isFetching && !data) ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">{t('charges.loadFailed')}</p>
      ) : !data || data.restaurants.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('charges.noChargesIn', { month: title })}</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('charges.columns.restaurant')}</TableHead>
                <TableHead className="text-right">{t('charges.columns.charges')}</TableHead>
                <TableHead className="text-right">{t('charges.columns.charged')}</TableHead>
                <TableHead className="text-right">{t('charges.columns.billed')}</TableHead>
                <TableHead className="text-right">{t('charges.columns.unbilled')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.restaurants.map((restaurant) => (
                <TableRow key={restaurant.partnerId}>
                  <TableCell className="font-medium">
                    <Link
                      className="underline underline-offset-2"
                      href={{
                        pathname: EAdminRoutes.CHARGES_PARTNER_MONTH,
                        query: { month, partnerId: restaurant.partnerId },
                      }}
                    >
                      {restaurant.partnerName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{restaurant.count}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatTotals(restaurant.totals, 'charged', language)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatTotals(restaurant.totals, 'billed', language)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatTotals(restaurant.totals, 'unbilled', language)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-sm text-muted-foreground">{t(DELIVERY_FEE_NOTE_KEY)}</p>
        </>
      )}
    </>
  )
}

function earlierCount(earlier: { count: number }[]): number {
  return earlier.reduce((sum, item) => sum + item.count, 0)
}
