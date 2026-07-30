import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/admin-web-components'
import { formatDate } from '@/ui-shared-utils'

export type ReassignmentRecord = {
  droppedCourierId: string
  droppedCourierName: string
  newCourierId: string
  newCourierName: string
  policy: string
  percent: number
  amount: number
  currencyCode: string
  message: string | null
  submittedAt: Date
}

interface ReassignmentRecordProps {
  record: ReassignmentRecord
}

// In-memory receipt card displaying the submission details of a rider reassignment.
export const ReassignmentRecordCard: React.FC<ReassignmentRecordProps> = ({ record }) => {
  const formattedAmount = (record.amount / 100).toFixed(2)

  return (
    <Card className="mt-4 border-amber-200 bg-amber-50/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Reassignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-muted-foreground block">Dropped Rider</span>
            <span className="font-medium">{record.droppedCourierName}</span>
          </div>

          <div>
            <span className="text-xs text-muted-foreground block">New Rider</span>
            <span className="font-medium">{record.newCourierName}</span>
          </div>

          <div>
            <span className="text-xs text-muted-foreground block">Payout Policy</span>
            <span>{record.policy} ({record.percent}%)</span>
          </div>

          <div>
            <span className="text-xs text-muted-foreground block">Compensation Awarded</span>
            <span className="font-semibold text-emerald-700">{formattedAmount} {record.currencyCode}</span>
          </div>

          <div>
            <span className="text-xs text-muted-foreground block">Reason / Note</span>
            <span>{record.message || '—'}</span>
          </div>

          <div>
            <span className="text-xs text-muted-foreground block">Submitted At</span>
            <span>{formatDate(record.submittedAt)}</span>
          </div>
        </div>

        <div className="border-t border-amber-200 pt-3 text-xs text-muted-foreground italic">
          Recorded on the server as a <code className="font-mono text-amber-900 bg-amber-100 px-1 py-0.5 rounded">REASSIGNED</code> DeliveryEvent. This panel is this browser's copy of what was submitted and is lost on reload — adminweb has no endpoint for reading a Delivery's event history yet.
        </div>
      </CardContent>
    </Card>
  )
}
