import React, { useState } from 'react'
import Link from 'next/link'
import { Button, Textarea, useToast } from '@/admin-web-components'
import { useResolveProductReportMutation } from '@/api/deliveriesApi'
import type { ProductReportAdminDto } from '@/backend-admin-sdk'
import { useTranslation } from 'react-i18next'
import { useServerText } from '@/i18n/useServerText'
import { useFormat } from '@/i18n/useFormat'

// The two kinds of report, in the order the Add form offers them. Their words are
// `productReports.kind.<KIND>` and the senders' `productReports.source.<SOURCE>` (src/i18n/resources).
export const KINDS = ['WRONG_ITEM', 'MISSING_ITEM'] as const

// One product report: what it is, who sent it, and a way to resolve it (spec 0032, AC-6, AC-7).
export function ProductReportRow({ report }: { report: ProductReportAdminDto }) {
  const { toast } = useToast()
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // errorText: the server's refusal in the reader's language, or our own sentence when it gave none.
  const { errorText } = useServerText()
  // Dates in the reader's language, on Athens time.
  const f = useFormat()
  const [resolving, setResolving] = useState(false)
  const [resolution, setResolution] = useState('')
  const [resolveReport, state] = useResolveProductReportMutation()

  const save = async () => {
    try {
      await resolveReport({ id: report.id, resolution: resolution.trim() || undefined }).unwrap()
      setResolving(false)
    } catch (err: any) {
      toast({ title: errorText(err, t('productReports.row.resolveFailed')), variant: 'destructive' })
    }
  }

  return (
    <div className="p-3 rounded-lg border border-border bg-card space-y-1" data-testid="product-report-row">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-semibold">
          {t(`productReports.kind.${report.kind}`, { defaultValue: report.kind })}
          {report.itemName ? `: ${report.itemName}` : ''}
        </span>
        <Link href={`/deliveries/${report.deliveryId}`} className="text-xs underline">
          {t('productReports.row.delivery')}
        </Link>
        <span className="text-xs text-muted-foreground">{f.dateTime(report.createdAt)}</span>
      </div>
      <div className="text-xs">
        <span className="text-muted-foreground">{t('productReports.row.from')}</span>
        <span className="font-medium">
          {t(`productReports.source.${report.source}`, { defaultValue: report.source })}
          {report.reporterEmail ? ` · ${report.reporterEmail}` : ''}
        </span>
      </div>
      {report.note ? <p className="text-xs whitespace-pre-wrap break-words">{report.note}</p> : null}
      {report.resolvedAt ? (
        <p className="text-xs text-muted-foreground">
          {t('productReports.row.resolved', { date: f.dateTime(report.resolvedAt) })}
          {report.resolution ? `: ${report.resolution}` : ''}
        </p>
      ) : resolving ? (
        <div className="space-y-2">
          <Textarea
            aria-label={t('productReports.row.resolution')}
            value={resolution}
            maxLength={500}
            onChange={(event) => setResolution(event.target.value)}
          />
          <Button type="button" size="sm" disabled={state.isLoading} onClick={save}>
            {t('common.save')}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setResolving(true)}>
          {t('productReports.row.resolve')}
        </Button>
      )}
    </div>
  )
}
