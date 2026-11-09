import React, { useState } from 'react'
import type { NextPage } from 'next'
import { Button } from '@/admin-web-components'
import { useGetProductReportsQuery } from '@/api/deliveriesApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { PageHeader } from '@/components/layouts/PageHeader'
import { ProductReportRow } from '@/modules/product-reports/ProductReportRow'

type State = 'open' | 'resolved' | 'all'

const PER_PAGE = 20
const STATES: { key: State; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
]

// Spec 0032 (AC-6): the co-op's product reports, newest first.
const ProductReportsPage: NextPage = () => {
  const [state, setState] = useState<State>('open')
  const [page, setPage] = useState(1)
  const reportsQuery = useGetProductReportsQuery({ state, page, perPage: PER_PAGE })
  const reports = reportsQuery.currentData?.data ?? []
  const pageCount = reportsQuery.currentData?.pagination?.totalPages ?? 1

  return (
    <DefaultLayout>
      <PageHeader title="Product reports" description="Wrong or missing products reported by riders, restaurants or the co-op." />
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {STATES.map((option) => (
            <Button
              key={option.key}
              type="button"
              size="sm"
              variant={state === option.key ? 'default' : 'outline'}
              onClick={() => {
                setState(option.key)
                setPage(1)
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
        {reportsQuery.isError ? <p className="text-sm text-destructive">Could not load the product reports.</p> : null}
        {!reportsQuery.isError && !reportsQuery.isLoading && reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No product reports here.</p>
        ) : null}
        {reports.map((report) => (
          <ProductReportRow key={report.id} report={report} />
        ))}
        {pageCount > 1 ? (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {pageCount}
            </span>
            <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </DefaultLayout>
  )
}

export default ProductReportsPage
