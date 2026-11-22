import React from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { Printer } from '@phosphor-icons/react'
import { Button } from '@/admin-web-components'
import { useGetPartnerBillStatementQuery } from '@/api/partnerChargeApi'
import { useCoopName } from '@/components/layouts/AdminSidebar'
import { formatMoney } from '@/i18n/format'
import { toLanguage } from '@/i18n/language'
import { athensDayTime, monthTitle } from '@/utils/athensMonth'
import { formatAmounts } from './chargeTotals'
import { greekBillLabel, greekReason, orderLabel } from './chargeWording'

// The statement's four column headings, in order (keys under charges.statement.columns).
const COLUMNS = ['when', 'order', 'reason', 'amount'] as const

// Spec 0036, AC-9. One bill's statement, in Greek, to send the restaurant: the co-op, the
// restaurant, the month, the bill and its own lines only. It is not a tax document (the accountant
// issues the invoice). The page has no sidebar, and printing shows the statement alone: the one
// button here is hidden on paper (`print:hidden`).
// Spec 0054, cross check 11: the statement stays Greek whatever the reader's language, because it is a
// Greek document. Only the admin's own words (Print, loading, errors) follow the reader's language.
export function BillStatementPage() {
  const router = useRouter()
  // useTranslation gives t (the reader's language) and i18n, whose getFixedT('el') always answers in
  // Greek: the statement's words come from that one.
  const { t, i18n } = useTranslation()
  const tGreek = i18n.getFixedT('el')
  const readerLanguage = toLanguage(i18n.language)
  const billId = typeof router.query.billId === 'string' ? router.query.billId : ''
  const query = useGetPartnerBillStatementQuery({ billId }, { skip: !billId })
  const statement = query.currentData
  const coopName = useCoopName()

  if (!router.isReady || query.isLoading || (query.isFetching && !statement)) {
    return <p className="p-8 text-sm text-muted-foreground">{t('common.loading')}</p>
  }
  if (query.isError || !statement) {
    return (
      <p className="p-8 text-sm text-destructive">
        {(query.error as { statusCode?: number } | undefined)?.statusCode === 404
          ? t('charges.statementPage.notFound')
          : t('charges.statementPage.loadFailed')}
      </p>
    )
  }

  const { bill, partner, lines } = statement
  const label = greekBillLabel(tGreek, bill)

  return (
    <>
      <Head>
        <title>{`${tGreek('charges.statement.title')} · ${partner.name} · ${label}`}</title>
      </Head>
      <main lang="el" className="mx-auto max-w-3xl bg-background p-8 text-foreground print:max-w-none print:p-0">
        <div className="mb-6 flex justify-end print:hidden">
          {/* The page is Greek, but this one admin control is in the reader's language: lang says which. */}
          <Button type="button" lang={readerLanguage} onClick={() => window.print()}>
            <Printer aria-hidden="true" className="mr-2 h-4 w-4" />
            {t('charges.statementPage.print')}
          </Button>
        </div>

        {bill.undoneAt ? (
          <p
            role="status"
            className="mb-6 rounded-md border-2 border-destructive p-3 text-center text-lg font-bold uppercase tracking-wide text-destructive"
          >
            {tGreek('charges.statement.undoneBanner')}
          </p>
        ) : null}

        <header className="mb-8 space-y-1">
          <p className="text-sm text-muted-foreground">{coopName}</p>
          <h1 className="text-2xl font-bold">{tGreek('charges.statement.title')}</h1>
          <p className="text-lg font-semibold">{partner.name}</p>
          {partner.pickupAddress ? <p className="text-sm">{partner.pickupAddress}</p> : null}
          <p className="text-sm">{monthTitle(statement.month, 'el')}</p>
          <p className="text-sm">
            {label}
            {bill.reference ? ` · ${athensDayTime(bill.createdAt)}` : null}
          </p>
        </header>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-foreground text-left">
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className={`py-2 pr-3 ${column === 'amount' ? 'text-right' : ''}`}>
                  {tGreek(`charges.statement.columns.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-border align-top">
                <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{athensDayTime(line.happenedAt)}</td>
                <td className="whitespace-nowrap py-2 pr-3">{orderLabel(line)}</td>
                <td className="py-2 pr-3">{greekReason(tGreek, line)}</td>
                <td className="whitespace-nowrap py-2 text-right tabular-nums">
                  {formatMoney(line.amount, line.currencyCode, 'el')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-foreground font-bold">
              <th scope="row" colSpan={3} className="py-2 pr-3 text-left">
                {tGreek('charges.statement.total')}
              </th>
              <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatAmounts(statement.totals, 'el')}</td>
            </tr>
          </tfoot>
        </table>

        <footer className="mt-8 space-y-1 text-sm">
          <p>{tGreek('charges.statement.notATaxDocument')}</p>
          <p>{tGreek('charges.statement.customerPaysDelivery')}</p>
        </footer>
      </main>
    </>
  )
}
