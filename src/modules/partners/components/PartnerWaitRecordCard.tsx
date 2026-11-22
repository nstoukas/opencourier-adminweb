import React, { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, useToast } from '@/admin-web-components'
import { useGetPartnerWaitRecordQuery, useUpdatePartnerMutation } from '@/api/partnersApi'
import { useTranslation } from 'react-i18next'
import { useServerText } from '@/i18n/useServerText'
import { useFormat } from '@/i18n/useFormat'

const PERIODS = [7, 30, 90]
const USUAL_PREP_MAX = 90


// Spec 0030 (AC-7): how this restaurant is doing, in figures about it and never about a rider.
export function PartnerWaitRecordCard({ partnerId, partnerName }: { partnerId: string; partnerName: string }) {
  const { toast } = useToast()
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // errorText: the server's refusal in the reader's language, or our own sentence when it gave none.
  const { errorText } = useServerText()
  // Numbers in the reader's style: "5,2" in Greek, "5.2" in English.
  const f = useFormat()
  const [days, setDays] = useState(30)
  const recordQuery = useGetPartnerWaitRecordQuery({ id: partnerId, days })
  const [updatePartner, updateState] = useUpdatePartnerMutation()
  const record = recordQuery.currentData

  // A figure, or "Not enough orders yet" when the server has too few orders to give one.
  const orNotEnough = (value: number | null, render: (value: number) => string) =>
    value === null ? t('partners.waitRecord.notEnough') : render(value)

  const median = record?.medianPrepMinutes ?? null
  const canAdopt = record !== undefined && median !== null && median >= 0 && median <= USUAL_PREP_MAX && median !== record.usualPrepMinutes

  const handleAdopt = async () => {
    if (median === null) return
    try {
      await updatePartner({ id: partnerId, data: { usualPrepMinutes: median } }).unwrap()
      toast({ title: t('partners.waitRecord.adopted', { name: partnerName, minutes: median }) })
    } catch (err: any) {
      toast({ title: errorText(err, t('partners.waitRecord.adoptFailed')), variant: 'destructive' })
    }
  }

  return (
    <Card className="min-w-0" data-testid="wait-record">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('partners.waitRecord.title')}</CardTitle>
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
              {t('partners.waitRecord.days', { count: period })}
            </Button>
          ))}
        </div>
        {recordQuery.isError ? <p className="text-destructive">{t('partners.waitRecord.loadFailed')}</p> : null}
        {record ? (
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">{t('partners.waitRecord.ridersWaited')}</dt>
              <dd className="font-medium">{orNotEnough(record.averageWaitMinutes, (value) => t('partners.waitRecord.averageWait', { minutes: f.number(value) }))}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('partners.waitRecord.ranLate')}</dt>
              <dd className="font-medium">{orNotEnough(record.lateShare, (value) => t('partners.waitRecord.lateShare', { percent: Math.round(value * 100) }))}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('partners.waitRecord.realPrep')}</dt>
              <dd className="font-medium">{orNotEnough(record.medianPrepMinutes, (value) => t('partners.waitRecord.prepMinutes', { minutes: f.number(value) }))}</dd>
            </div>
          </dl>
        ) : null}
        {canAdopt ? (
          <Button type="button" variant="outline" disabled={updateState.isLoading} onClick={handleAdopt}>
            {t('partners.waitRecord.adopt', { minutes: median })}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
