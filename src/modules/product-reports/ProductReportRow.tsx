import React, { useState } from 'react'
import { Button, Textarea } from '@/admin-web-components'
import { useResolveProductReportMutation } from '@/api/deliveriesApi'
import type { ProductReportAdminDto } from '@/backend-admin-sdk'
import { formatDate } from '@/ui-shared-utils'

export const KIND_WORDS = { WRONG_ITEM: 'Wrong item', MISSING_ITEM: 'Missing item' } as const
const SOURCE_WORDS = { COURIER: 'Rider', PARTNER: 'Restaurant', ADMIN: 'Admin' } as const

// One product report: what it is, who sent it, and a way to resolve it (spec 0032, AC-6, AC-7).
export function ProductReportRow({ report }: { report: ProductReportAdminDto }) {
  const [resolving, setResolving] = useState(false)
  const [resolution, setResolution] = useState('')
  const [resolveReport, state] = useResolveProductReportMutation()

  const save = async () => {
    await resolveReport({ id: report.id, resolution: resolution.trim() || undefined })
    setResolving(false)
  }

  return (
    <div className="p-3 rounded-lg border border-border bg-card space-y-1" data-testid="product-report-row">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-semibold">
          {KIND_WORDS[report.kind]}
          {report.itemName ? `: ${report.itemName}` : ''}
        </span>
        <span className="text-xs text-muted-foreground">{formatDate(report.createdAt)}</span>
      </div>
      <div className="text-xs">
        <span className="text-muted-foreground">From </span>
        <span className="font-medium">
          {SOURCE_WORDS[report.source]}
          {report.reporterEmail ? ` · ${report.reporterEmail}` : ''}
        </span>
      </div>
      {report.note ? <p className="text-xs whitespace-pre-wrap break-words">{report.note}</p> : null}
      {report.resolvedAt ? (
        <p className="text-xs text-muted-foreground">
          Resolved {formatDate(report.resolvedAt)}
          {report.resolution ? `: ${report.resolution}` : ''}
        </p>
      ) : resolving ? (
        <div className="space-y-2">
          <Textarea
            aria-label="Resolution"
            value={resolution}
            maxLength={500}
            onChange={(event) => setResolution(event.target.value)}
          />
          <Button type="button" size="sm" disabled={state.isLoading} onClick={save}>
            Save
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setResolving(true)}>
          Resolve
        </Button>
      )}
    </div>
  )
}
