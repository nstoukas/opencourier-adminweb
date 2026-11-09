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
  const reportsQuery = useGetProductReportsQuery({ state, page: 1, perPage: PER_PAGE })
  const reports = reportsQuery.currentData?.data ?? []

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
              onClick={() => setState(option.key)}
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
      </div>
    </DefaultLayout>
  )
}

export default ProductReportsPage
