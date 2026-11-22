import React, { useState } from 'react'
import { useRouter } from 'next/router'
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
import { COMPLAINT_TEXT_MAX, RIDER_CATEGORIES, categoryText } from './complaintDisplay'

// Spec 0052 (AC-3; cross check 3): on the delivery page, an admin files a complaint about the order's rider
// on behalf of whoever phoned in (a restaurant, a customer, anyone), naming the caller in the text. The
// rider is told at once and replies before anyone decides. On a reassigned job the admin picks which of
// the riders who accepted it; with none, there is nobody to complain about.
export function FileComplaintCard({ deliveryId }: { deliveryId: string }) {
  const { toast } = useToast()
  const router = useRouter()
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
      toast({ title: 'Complaint filed. The rider is told and replies before anyone decides.' })
      setOpen(false)
      setText('')
      setCategory(null)
      void router.push({ pathname: EAdminRoutes.COMPLAINT_DETAILS, query: { complaintId: filed.id } })
    } catch (err: any) {
      toast({ title: err?.message || 'The complaint could not be filed.', variant: 'destructive' })
    }
  }

  return (
    <Card data-testid="file-complaint">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Complaint about the rider</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!open ? (
          <>
            <p className="text-muted-foreground">
              Someone phoned in about the rider on this order? File it here for them. Complaints are handled on the
              Complaints page.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
              File a complaint for a caller
            </Button>
          </>
        ) : riders.isError ? (
          <p role="alert" className="text-destructive">
            The order&apos;s riders could not be loaded.
          </p>
        ) : !riders.currentData ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : riderList.length === 0 ? (
          <p className="text-muted-foreground">No rider accepted this order, so there is nobody to complain about.</p>
        ) : (
          <div className="space-y-3">
            {onlyRider ? (
              <p>
                About <span className="font-medium">{onlyRider.name}</span>
              </p>
            ) : (
              <div className="space-y-1">
                <Label>Which rider (this order was reassigned)</Label>
                <Select value={chosenRider} onValueChange={setChosenRider}>
                  <SelectTrigger aria-label="Which rider">
                    <SelectValue placeholder="Pick the rider" />
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
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What happened">
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
                  {categoryText(value)}
                </Button>
              ))}
            </div>
            <div className="space-y-1">
              <Label htmlFor="file-complaint-text">What the caller said</Label>
              <p className="text-xs text-muted-foreground">Name who called in. The rider reads this text.</p>
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
                File the complaint
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
