import React from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Printer } from '@phosphor-icons/react'
import { Button } from '@/admin-web-components'
import { useGetPartnerBillStatementQuery } from '@/api/partnerChargeApi'
import { useCoopName } from '@/components/layouts/AdminSidebar'
import { athensDayTime } from '@/utils/athensMonth'
import { orderLabel } from './chargeWording'
import { GREEK, formatGreekAmount, greekBillLabel, greekMonthTitle, greekReason, greekTotals } from './greek'

// Spec 0036, AC-9. One bill's statement, in Greek, to send the restaurant: the co-op, the
// restaurant, the month, the bill and its own lines only. It is not a tax document (the accountant
// issues the invoice). The page has no sidebar, and printing shows the statement alone: the one
// button here is hidden on paper (`print:hidden`).
export function BillStatementPage() {
  const router = useRouter()
  const billId = typeof router.query.billId === 'string' ? router.query.billId : ''
  const query = useGetPartnerBillStatementQuery({ billId }, { skip: !billId })
  const statement = query.currentData
  const coopName = useCoopName()

  if (!router.isReady || query.isLoading || (query.isFetching && !statement)) {
    return <p className="p-8 text-sm text-muted-foreground">Loading…</p>
  }
  if (query.isError || !statement) {
    return (
      <p className="p-8 text-sm text-destructive">
        {(query.error as { statusCode?: number } | undefined)?.statusCode === 404
          ? 'This bill was not found.'
          : 'Could not load the statement.'}
      </p>
    )
  }

  const { bill, partner, lines } = statement
  const label = greekBillLabel(bill)

  return (
    <>
      <Head>
        <title>{`${GREEK.statementTitle} · ${partner.name} · ${label}`}</title>
      </Head>
      <main lang="el" className="mx-auto max-w-3xl bg-background p-8 text-foreground print:max-w-none print:p-0">
        <div className="mb-6 flex justify-end print:hidden">
          {/* lang="en": the page is Greek, but this one admin control is English. */}
          <Button type="button" lang="en" onClick={() => window.print()}>
            <Printer aria-hidden="true" className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>

        {bill.undoneAt ? (
          <p
            role="status"
            className="mb-6 rounded-md border-2 border-destructive p-3 text-center text-lg font-bold uppercase tracking-wide text-destructive"
          >
            {GREEK.undoneBanner}
          </p>
        ) : null}

        <header className="mb-8 space-y-1">
          <p className="text-sm text-muted-foreground">{coopName}</p>
          <h1 className="text-2xl font-bold">{GREEK.statementTitle}</h1>
          <p className="text-lg font-semibold">{partner.name}</p>
          {partner.pickupAddress ? <p className="text-sm">{partner.pickupAddress}</p> : null}
          <p className="text-sm">{greekMonthTitle(statement.month)}</p>
          <p className="text-sm">
            {label}
            {bill.reference ? ` · ${athensDayTime(bill.createdAt)}` : null}
          </p>
        </header>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-foreground text-left">
              {GREEK.columns.map((column, index) => (
                <th key={column} scope="col" className={`py-2 pr-3 ${index === 3 ? 'text-right' : ''}`}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-border align-top">
                <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{athensDayTime(line.happenedAt)}</td>
                <td className="whitespace-nowrap py-2 pr-3">{orderLabel(line)}</td>
                <td className="py-2 pr-3">{greekReason(line)}</td>
                <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatGreekAmount(line.amount, line.currencyCode)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-foreground font-bold">
              <th scope="row" colSpan={3} className="py-2 pr-3 text-left">
                {GREEK.total}
              </th>
              <td className="whitespace-nowrap py-2 text-right tabular-nums">{greekTotals(statement.totals)}</td>
            </tr>
          </tfoot>
        </table>

        <footer className="mt-8 space-y-1 text-sm">
          <p>{GREEK.notATaxDocument}</p>
          <p>{GREEK.deliveryFeeNote}</p>
        </footer>
      </main>
    </>
  )
}
