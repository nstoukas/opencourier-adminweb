import React, { useState } from 'react'
import type { NextPage } from 'next'
import { Button } from '@/admin-web-components'
import { useGetProductReportsQuery } from '@/api/deliveriesApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { PageHeader } from '@/components/layouts/PageHeader'
import { ProductReportRow } from '@/modules/product-reports/ProductReportRow'
import { useTranslation } from 'react-i18next'

type State = 'open' | 'resolved' | 'all'

const PER_PAGE = 20
// The tabs; each one's words are `productReports.page.states.<key>`, looked up when drawn.
const STATES: State[] = ['open', 'resolved', 'all']

// Spec 0032 (AC-6): the co-op's product reports, newest first.
const ProductReportsPage: NextPage = () => {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const [state, setState] = useState<State>('open')
  const [page, setPage] = useState(1)
  const reportsQuery = useGetProductReportsQuery({ state, page, perPage: PER_PAGE })
  const reports = reportsQuery.currentData?.data ?? []
  const pageCount = reportsQuery.currentData?.pagination?.totalPages ?? 1

  return (
    <DefaultLayout>
      <PageHeader title={t('productReports.page.title')} description={t('productReports.page.description')} />
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {STATES.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={state === option ? 'default' : 'outline'}
              onClick={() => {
                setState(option)
                setPage(1)
              }}
            >
              {t(`productReports.page.states.${option}`)}
            </Button>
          ))}
        </div>
        {reportsQuery.isError ? <p className="text-sm text-destructive">{t('productReports.page.loadFailed')}</p> : null}
        {!reportsQuery.isError && !reportsQuery.isLoading && reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('productReports.page.none')}</p>
        ) : null}
        {reports.map((report) => (
          <ProductReportRow key={report.id} report={report} />
        ))}
        {pageCount > 1 ? (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {t('productReports.page.previous')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t('productReports.page.pageOf', { page, pages: pageCount })}
            </span>
            <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
              {t('productReports.page.next')}
            </Button>
          </div>
        ) : null}
      </div>
    </DefaultLayout>
  )
}

export default ProductReportsPage
