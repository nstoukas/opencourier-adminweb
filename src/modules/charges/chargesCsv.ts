import type { TFunction } from 'i18next'
import type { PartnerChargeBilledLineDto } from '@/backend-admin-sdk'
import { athensIsoMinute } from '@/utils/athensMonth'
import { greekBillLabel, greekReason, orderLabel } from './chargeWording'

// Spec 0036, AC-10. A CSV that opens straight into columns in Greek Excel: a byte order mark so it
// reads as UTF-8, `;` between fields (Greek Excel's list separator, since `,` is the decimal comma),
// CRLF line ends, amounts with a decimal comma and no currency sign. Built in the browser from the
// route data, so nothing is stored on the server. The CSV is Greek whatever the reader's language
// (spec 0054, cross check 11): its words come from `charges.statement.*` through a Greek translator.

const BOM = '\uFEFF'

// A text field, quoted with inner quotes doubled. Restaurant names, references and removal labels
// are free text: one starting with = + - or @ (AC-10), or a tab or carriage return (which some
// spreadsheets skip before reading a formula), would run as a formula, so it gets a leading '.
export function csvText(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${guarded.replace(/"/g, '""')}"`
}

// "1234,50": decimal comma, no thousands separator, no currency sign (spreadsheets read it as a number).
export function csvNumber(cents: number): string {
  return new Intl.NumberFormat('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }).format(
    cents / 100
  )
}

// The header row: the columns in order, joined with ";" like every other row.
const CSV_COLUMNS = [
  'restaurant',
  'when',
  'order',
  'reason',
  'minutesLate',
  'amount',
  'currency',
  'billed',
  'bill',
  'deliveryId',
] as const

export interface CsvChargeLine extends PartnerChargeBilledLineDto {
  partnerName: string
}

// `tGreek` is a Greek translator: `i18n.getFixedT('el')` from useTranslation's i18n.
export function buildChargesCsv(tGreek: TFunction, lines: CsvChargeLine[]): string {
  const header = CSV_COLUMNS.map((column) => tGreek(`charges.statement.csv.${column}`)).join(';')
  const rows = lines.map((line) =>
    [
      csvText(line.partnerName),
      csvText(athensIsoMinute(line.happenedAt)),
      csvText(orderLabel(line)),
      csvText(greekReason(tGreek, line)),
      // The column is minutes past the agreed ready time; a split wait is not that (row 11 tests), so empty.
      line.reason === 'WAITING' && !line.splitWait && line.waitMinutes != null ? String(line.waitMinutes) : '',
      csvNumber(line.amount),
      csvText(line.currencyCode),
      csvText(tGreek(line.billId ? 'charges.statement.yes' : 'charges.statement.no')),
      csvText(line.bill ? greekBillLabel(tGreek, line.bill) : ''),
      csvText(line.deliveryId),
    ].join(';')
  )
  return BOM + [header, ...rows].join('\r\n') + '\r\n'
}

// Hands the text to the browser as a file to save.
export function downloadCsv(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Safari fetches a clicked download a moment later; freeing the link at once can cancel it.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
