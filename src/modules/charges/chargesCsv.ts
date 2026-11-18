import type { PartnerChargeBilledLineDto } from '@/backend-admin-sdk'
import { athensIsoMinute } from '@/utils/athensMonth'
import { orderLabel } from './chargeWording'
import { GREEK, formatGreekNumber, greekBillLabel, greekReason } from './greek'

// Spec 0036, AC-10. A CSV that opens straight into columns in Greek Excel: a byte order mark so it
// reads as UTF-8, `;` between fields (Greek Excel's list separator, since `,` is the decimal comma),
// CRLF line ends, amounts with a decimal comma and no currency sign. Built in the browser from the
// route data, so nothing is stored on the server.

const BOM = '\uFEFF'

// A text field, quoted with inner quotes doubled. Restaurant names, references and removal labels
// are free text: one starting with = + - or @ (AC-10), or a tab or carriage return (which some
// spreadsheets skip before reading a formula), would run as a formula, so it gets a leading '.
export function csvText(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${guarded.replace(/"/g, '""')}"`
}

export interface CsvChargeLine extends PartnerChargeBilledLineDto {
  partnerName: string
}

export function buildChargesCsv(lines: CsvChargeLine[]): string {
  const rows = lines.map((line) =>
    [
      csvText(line.partnerName),
      csvText(athensIsoMinute(line.happenedAt)),
      csvText(orderLabel(line)),
      csvText(greekReason(line)),
      line.reason === 'WAITING' && line.waitMinutes != null ? String(line.waitMinutes) : '',
      formatGreekNumber(line.amount),
      csvText(line.currencyCode),
      csvText(line.billId ? GREEK.yes : GREEK.no),
      csvText(line.bill ? greekBillLabel(line.bill) : ''),
      csvText(line.deliveryId),
    ].join(';')
  )
  return BOM + [GREEK.csvHeader, ...rows].join('\r\n') + '\r\n'
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
