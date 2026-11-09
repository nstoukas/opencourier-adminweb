import React, { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea, useToast } from '@/admin-web-components'
import { useCreateDeliveryProductReportMutation, useGetDeliveryProductReportsQuery } from '@/api/deliveriesApi'
import { usePageVisible } from '@/hooks/usePageVisible'
import { KIND_WORDS, ProductReportRow } from './ProductReportRow'

type Kind = 'WRONG_ITEM' | 'MISSING_ITEM'

// Spec 0032 (AC-9): one delivery's product reports, with Add for someone who phoned the co-op.
// Beside "Rider reports" on purpose: the two records hold different things.
export function ProductReportsCard({ deliveryId }: { deliveryId: string }) {
  const { toast } = useToast()
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
      toast({ title: 'Name the item or add a note.', variant: 'destructive' })
      return
    }
    try {
      await createReport({ deliveryId, kind, itemName: item || undefined, note: text || undefined }).unwrap()
      setAdding(false)
      setItemName('')
      setNote('')
    } catch (err: any) {
      toast({ title: err?.message || 'The report could not be saved.', variant: 'destructive' })
    }
  }

  const reports = reportsQuery.currentData ?? []

  return (
    <Card className="mt-4" data-testid="product-reports">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Product reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {reportsQuery.isError ? <div className="text-destructive">Could not load the product reports.</div> : null}
        {!reportsQuery.isError && reports.length === 0 ? (
          <div className="text-muted-foreground">No product has been reported for this delivery.</div>
        ) : null}
        {reports.map((report) => (
          <ProductReportRow key={report.id} report={report} />
        ))}
        {adding ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              {(Object.keys(KIND_WORDS) as Kind[]).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={kind === value ? 'default' : 'outline'}
                  onClick={() => setKind(value)}
                >
                  {KIND_WORDS[value]}
                </Button>
              ))}
            </div>
            <Input
              aria-label="Item"
              placeholder="Item"
              value={itemName}
              maxLength={120}
              onChange={(event) => setItemName(event.target.value)}
            />
            <Textarea aria-label="Note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
            <Button type="button" size="sm" disabled={createState.isLoading} onClick={add}>
              Save report
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            Add report
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
