import React, { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { DownloadSimple, Printer, Receipt } from '@phosphor-icons/react'
import {
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/admin-web-components'
import type { PartnerBillDto } from '@/backend-admin-sdk'
import { useGetPartnerChargePartnerMonthQuery } from '@/api/partnerChargeApi'
import { PageHeader } from '@/components/layouts/PageHeader'
import { EAdminRoutes } from '@/hooks/useAdminPageNavigator'
import { athensDayTime, isMonth, monthTitle } from '@/utils/athensMonth'
import { formatMoney } from '@/utils/formatMoney'
import { buildChargesCsv, downloadCsv } from './chargesCsv'
import { formatAmounts, formatTotals } from './chargeTotals'
import { DELIVERY_FEE_NOTE, adminOrderLabel, billLabel, reasonText } from './chargeWording'
import { MarkBilledDialog } from './MarkBilledDialog'
import { UndoBillDialog } from './UndoBillDialog'

// Spec 0036, AC-3 to AC-8, AC-10. One restaurant's month: every charge oldest first, the totals, its
// bills newest first, Mark as billed, Undo, each bill's statement and the month's CSV.
export function PartnerMonthPage() {
  const router = useRouter()
  const month = typeof router.query.month === 'string' ? router.query.month : ''
  const partnerId = typeof router.query.partnerId === 'string' ? router.query.partnerId : ''
  const validMonth = isMonth(month)
  const query = useGetPartnerChargePartnerMonthQuery({ month, partnerId }, { skip: !validMonth || !partnerId })
  // currentData: another restaurant or month never shows the previous one's lines (adminweb AGENTS.md).
  const data = query.currentData

  // The Mark as billed dialog, and the bill being undone, each give focus back to their button.
  const [billOpen, setBillOpen] = useState(false)
  const [undoing, setUndoing] = useState<PartnerBillDto | null>(null)
  const billButtonRef = useRef<HTMLButtonElement>(null)
  const undoOpenerRef = useRef<HTMLElement | null>(null)
  // After a bill or an undo is saved, focus goes to the Bills heading, where the result shows: the
  // opening button may be disabled (every line billed) or gone (an undone bill has no Undo) once the
  // list reloads. A Cancel returns focus to the button that opened the dialog.
  const billsHeadingRef = useRef<HTMLSpanElement>(null)
  const savedRef = useRef(false)
  const onSaved = () => {
    savedRef.current = true
  }
  const returnFocus = (target: React.RefObject<HTMLElement | null>) => (event: Event) => {
    const element = savedRef.current ? billsHeadingRef.current : target.current
    savedRef.current = false
    if (element?.isConnected) {
      event.preventDefault()
      element.focus()
    }
  }

  if (router.isReady && !validMonth) {
    return <p className="text-sm text-destructive">This address does not name a month (YYYY-MM).</p>
  }

  const title = validMonth ? monthTitle(month) : ''
  const unbilled = data ? data.charges.filter((line) => line.billId === null) : []

  return (
    <>
      <Breadcrumb
        steps={[
          {
            label: 'Charges',
            href: `/charges?month=${month}`,
            onClick: () => router.push({ pathname: EAdminRoutes.CHARGES, query: { month } }),
          },
          { label: data ? `${data.partner.name}, ${title}` : title },
        ]}
      />
      <PageHeader
        title={data ? data.partner.name : 'Charges'}
        description={`Charges in ${title}, Athens time.`}
        action={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={!data || data.charges.length === 0}
              onClick={() =>
                data &&
                downloadCsv(
                  `charges-${month}-${data.partner.name.replace(/[^\p{L}\p{N}]+/gu, '-')}.csv`,
                  buildChargesCsv(data.charges.map((line) => ({ ...line, partnerName: data.partner.name })))
                )
              }
            >
              <DownloadSimple aria-hidden="true" className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Button ref={billButtonRef} type="button" disabled={unbilled.length === 0} onClick={() => setBillOpen(true)}>
              <Receipt aria-hidden="true" className="mr-2 h-4 w-4" />
              Mark as billed
            </Button>
          </>
        }
      />

      {!router.isReady || query.isLoading || (query.isFetching && !data) ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          {(query.error as { statusCode?: number } | undefined)?.statusCode === 404
            ? 'This restaurant was not found.'
            : 'Could not load the charges.'}
        </p>
      ) : !data ? null : (
        <div className="flex flex-col gap-6">
          <section aria-label="Totals">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Total label="Charged" value={formatTotals(data.totals, 'charged')} />
              <Total label="Billed" value={formatTotals(data.totals, 'billed')} />
              <Total label="Unbilled" value={formatTotals(data.totals, 'unbilled')} />
            </dl>
            <p className="mt-3 text-sm text-muted-foreground">{DELIVERY_FEE_NOTE}</p>
          </section>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Lines</CardTitle>
            </CardHeader>
            <CardContent>
              {data.charges.length === 0 ? (
                <p className="text-sm text-muted-foreground">No charges in {title}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="pl-6">Billed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.charges.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          <time dateTime={line.happenedAt}>{athensDayTime(line.happenedAt)}</time>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Link
                            className="underline underline-offset-2"
                            href={{ pathname: EAdminRoutes.DELIVERY_DETAILS, query: { deliveryId: line.deliveryId } }}
                          >
                            {adminOrderLabel(line)}
                          </Link>
                        </TableCell>
                        <TableCell>{reasonText(line)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums">
                          {formatMoney(line.amount, line.currencyCode)}
                        </TableCell>
                        <TableCell className="pl-6">
                          {line.bill ? billLabel(line.bill) : <span className="text-muted-foreground">Not billed</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {/* tabIndex -1: focus can be put here by code, but Tab never stops on it. */}
                <span ref={billsHeadingRef} tabIndex={-1} className="outline-none">
                  Bills
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.bills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bills for {title} yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {data.bills.map((bill) => (
                    <li key={bill.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                      <div className="min-w-0 space-y-1 text-sm">
                        <p className={`font-medium ${bill.undoneAt ? 'text-muted-foreground line-through' : ''}`}>
                          {billLabel(bill)}
                        </p>
                        <p className="text-muted-foreground">
                          Billed by {bill.billedByLabel} on {athensDayTime(bill.createdAt)} ·{' '}
                          {bill.lineCount === 1 ? '1 line' : `${bill.lineCount} lines`} · {formatAmounts(bill.totals)}
                        </p>
                        {bill.undoneAt ? (
                          <p>
                            Undone by {bill.undoneByLabel} on {athensDayTime(bill.undoneAt)}: {bill.undoReason}
                          </p>
                        ) : null}
                      </div>
                      <span className="flex gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={{ pathname: EAdminRoutes.CHARGES_STATEMENT, query: { billId: bill.id } }}
                            target="_blank"
                            aria-label={`Statement for ${billLabel(bill)}, opens in a new tab`}
                          >
                            <Printer aria-hidden="true" className="mr-2 h-4 w-4" />
                            Statement
                          </Link>
                        </Button>
                        {bill.undoneAt ? null : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={`Undo ${billLabel(bill)}`}
                            onClick={(event) => {
                              undoOpenerRef.current = event.currentTarget
                              setUndoing(bill)
                            }}
                          >
                            Undo
                          </Button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {data ? (
        <MarkBilledDialog
          open={billOpen}
          partnerId={partnerId}
          month={month}
          unbilled={unbilled}
          onOpenChange={setBillOpen}
          onSaved={onSaved}
          onCloseAutoFocus={returnFocus(billButtonRef)}
        />
      ) : null}
      {undoing ? (
        <UndoBillDialog
          bill={undoing}
          onClose={() => setUndoing(null)}
          onSaved={onSaved}
          onCloseAutoFocus={returnFocus(undoOpenerRef)}
        />
      ) : null}
    </>
  )
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
