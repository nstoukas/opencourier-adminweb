import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from '@/admin-web-components'
import type { ComplaintCategory } from '@/backend-admin-sdk'
import { useFileComplaintMutation, useGetComplaintDeliveryRidersQuery } from '@/api/complaintApi'
import { EAdminRoutes } from '@/hooks/useAdminPageNavigator'
import { useServerText } from '@/i18n/useServerText'
import { COMPLAINT_TEXT_MAX, RIDER_CATEGORIES, categoryText } from './complaintDisplay'

// Spec 0052 (AC-3; cross check 3): on the delivery page, an admin files a complaint about the order's rider
// on behalf of whoever phoned in (a restaurant, a customer, anyone), naming the caller in the text. The
// rider is told at once and replies before anyone decides. On a reassigned job the admin picks which of
// the riders who accepted it; with none, there is nobody to complain about.
export function FileComplaintCard({ deliveryId }: { deliveryId: string }) {
  const { toast } = useToast()
  const router = useRouter()
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // errorText: the server's refusal in the reader's language, else the fallback given.
  const { errorText } = useServerText()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<ComplaintCategory | null>(null)
  const [chosenRider, setChosenRider] = useState<string>('')
  const [text, setText] = useState('')
  // Read only once the form is opened: most deliveries never need it.
  const riders = useGetComplaintDeliveryRidersQuery({ deliveryId }, { skip: !open || !deliveryId })
  const [fileComplaint, fileState] = useFileComplaintMutation()

  const riderList = riders.currentData ?? []
  // With one rider it is that rider; with several the admin must pick (the server answers 400 otherwise).
  const onlyRider = riderList.length === 1 ? riderList[0] : undefined
  const riderId = onlyRider ? onlyRider.id : chosenRider
  const trimmed = text.trim()
  const canSave =
    category !== null && trimmed.length > 0 && riderList.length > 0 && riderId !== '' && !fileState.isLoading

  const save = async () => {
    if (!category) return
    try {
      const filed = await fileComplaint({ deliveryId, category, text: trimmed, aboutCourierId: riderId }).unwrap()
      toast({ title: t('complaints.file.filed') })
      setOpen(false)
      setText('')
      setCategory(null)
      void router.push({ pathname: EAdminRoutes.COMPLAINT_DETAILS, query: { complaintId: filed.id } })
    } catch (err) {
      toast({ title: errorText(err, t('complaints.file.failed')), variant: 'destructive' })
    }
  }

  return (
    <Card data-testid="file-complaint">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('complaints.file.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!open ? (
          <>
            <p className="text-muted-foreground">{t('complaints.file.intro')}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
              {t('complaints.file.start')}
            </Button>
          </>
        ) : riders.isError ? (
          <p role="alert" className="text-destructive">
            {t('complaints.file.ridersFailed')}
          </p>
        ) : !riders.currentData ? (
          <p className="text-muted-foreground">{t('common.loading')}</p>
        ) : riderList.length === 0 ? (
          <p className="text-muted-foreground">{t('complaints.file.noRider')}</p>
        ) : (
          <div className="space-y-3">
            {onlyRider ? (
              <p>
                {t('complaints.file.about')} <span className="font-medium">{onlyRider.name}</span>
              </p>
            ) : (
              <div className="space-y-1">
                <Label>{t('complaints.file.whichRider')}</Label>
                <Select value={chosenRider} onValueChange={setChosenRider}>
                  <SelectTrigger aria-label={t('complaints.file.whichRiderShort')}>
                    <SelectValue placeholder={t('complaints.file.pickRider')} />
                  </SelectTrigger>
                  <SelectContent>
                    {riderList.map((rider) => (
                      <SelectItem key={rider.id} value={rider.id}>
                        {rider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* role="radiogroup" tells a screen reader these buttons are one choice. */}
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('complaints.file.whatHappened')}>
              {RIDER_CATEGORIES.map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  role="radio"
                  aria-checked={category === value}
                  variant={category === value ? 'default' : 'outline'}
                  onClick={() => setCategory(value)}
                >
                  {categoryText(t, value)}
                </Button>
              ))}
            </div>
            <div className="space-y-1">
              <Label htmlFor="file-complaint-text">{t('complaints.file.text')}</Label>
              <p className="text-xs text-muted-foreground">{t('complaints.file.textHint')}</p>
              <Textarea
                id="file-complaint-text"
                value={text}
                maxLength={COMPLAINT_TEXT_MAX}
                onChange={(event) => setText(event.target.value)}
              />
              <p className="text-right text-xs text-muted-foreground">
                {text.length}/{COMPLAINT_TEXT_MAX}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={!canSave} onClick={save}>
                {t('complaints.file.save')}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
