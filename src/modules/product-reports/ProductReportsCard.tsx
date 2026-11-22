import React, { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea, useToast } from '@/admin-web-components'
import { useCreateDeliveryProductReportMutation, useGetDeliveryProductReportsQuery } from '@/api/deliveriesApi'
import { usePageVisible } from '@/hooks/usePageVisible'
import { KINDS, ProductReportRow } from './ProductReportRow'
import { useTranslation } from 'react-i18next'
import { useServerText } from '@/i18n/useServerText'

// `(typeof KINDS)[number]` is the type of any item of KINDS: 'WRONG_ITEM' | 'MISSING_ITEM'.
type Kind = (typeof KINDS)[number]

// Spec 0032 (AC-9): one delivery's product reports, with Add for someone who phoned the co-op.
// Beside "Rider reports" on purpose: the two records hold different things.
export function ProductReportsCard({ deliveryId }: { deliveryId: string }) {
  const { toast } = useToast()
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // errorText: the server's refusal in the reader's language, or our own sentence when it gave none.
  const { errorText } = useServerText()
  const pageVisible = usePageVisible()
  const reportsQuery = useGetDeliveryProductReportsQuery(
    { deliveryId },
    { skip: !deliveryId, pollingInterval: pageVisible ? 30_000 : 0 },
  )
  const [createReport, createState] = useCreateDeliveryProductReportMutation()
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState<Kind>('WRONG_ITEM')
  const [itemName, setItemName] = useState('')
  const [note, setNote] = useState('')

  const add = async () => {
    const item = itemName.trim()
    const text = note.trim()
    if (!item && !text) {
      toast({ title: t('productReports.card.nameOrNote'), variant: 'destructive' })
      return
    }
    try {
      await createReport({ deliveryId, kind, itemName: item || undefined, note: text || undefined }).unwrap()
      setAdding(false)
      setItemName('')
      setNote('')
    } catch (err: any) {
      toast({ title: errorText(err, t('productReports.card.saveFailed')), variant: 'destructive' })
    }
  }

  const reports = reportsQuery.currentData ?? []

  return (
    <Card className="mt-4" data-testid="product-reports">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('productReports.card.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {reportsQuery.isError ? <div className="text-destructive">{t('productReports.card.loadFailed')}</div> : null}
        {!reportsQuery.isError && reports.length === 0 ? (
          <div className="text-muted-foreground">{t('productReports.card.none')}</div>
        ) : null}
        {reports.map((report) => (
          <ProductReportRow key={report.id} report={report} />
        ))}
        {adding ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              {KINDS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={kind === value ? 'default' : 'outline'}
                  onClick={() => setKind(value)}
                >
                  {t(`productReports.kind.${value}`)}
                </Button>
              ))}
            </div>
            <Input
              aria-label={t('productReports.card.item')}
              placeholder={t('productReports.card.item')}
              value={itemName}
              maxLength={120}
              onChange={(event) => setItemName(event.target.value)}
            />
            <Textarea
              aria-label={t('productReports.card.note')}
              value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
            <Button type="button" size="sm" disabled={createState.isLoading} onClick={add}>
              {t('productReports.card.saveReport')}
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            {t('productReports.card.addReport')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
