import React, { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, useToast } from '@/admin-web-components'
import { useGetPartnerWaitRecordQuery, useUpdatePartnerMutation } from '@/api/partnersApi'

const PERIODS = [7, 30, 90]
const USUAL_PREP_MAX = 90

const orNotEnough = (value: number | null, render: (value: number) => string) =>
  value === null ? 'Not enough orders yet' : render(value)

// Spec 0030 (AC-7): how this restaurant is doing, in figures about it and never about a rider.
export function PartnerWaitRecordCard({ partnerId, partnerName }: { partnerId: string; partnerName: string }) {
  const { toast } = useToast()
  const [days, setDays] = useState(30)
  const recordQuery = useGetPartnerWaitRecordQuery({ id: partnerId, days })
  const [updatePartner, updateState] = useUpdatePartnerMutation()
  const record = recordQuery.currentData

  const median = record?.medianPrepMinutes ?? null
  const canAdopt = record !== undefined && median !== null && median >= 0 && median <= USUAL_PREP_MAX && median !== record.usualPrepMinutes

  const handleAdopt = async () => {
    if (median === null) return
    try {
      await updatePartner({ id: partnerId, data: { usualPrepMinutes: median } }).unwrap()
      toast({ title: `${partnerName} now uses ${median} min as its usual prep time.` })
    } catch (err: any) {
      toast({ title: err?.message || 'The usual prep time could not be changed.', variant: 'destructive' })
    }
  }

  return (
    <Card className="min-w-0" data-testid="wait-record">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Wait record</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex gap-2">
          {PERIODS.map((period) => (
            <Button
              key={period}
              type="button"
              size="sm"
              variant={period === days ? 'default' : 'outline'}
              onClick={() => setDays(period)}
            >
              {period} days
            </Button>
          ))}
        </div>
        {recordQuery.isError ? <p className="text-destructive">Could not load the record.</p> : null}
        {record ? (
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Riders waited past ready</dt>
              <dd className="font-medium">{orNotEnough(record.averageWaitMinutes, (value) => `${value} min on average`)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Orders that ran late</dt>
              <dd className="font-medium">{orNotEnough(record.lateShare, (value) => `${Math.round(value * 100)}%`)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Real prep time</dt>
              <dd className="font-medium">{orNotEnough(record.medianPrepMinutes, (value) => `${value} min`)}</dd>
            </div>
          </dl>
        ) : null}
        {canAdopt ? (
          <Button type="button" variant="outline" disabled={updateState.isLoading} onClick={handleAdopt}>
            Use {median} min as the usual prep time
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
