import React, { useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  useToast,
} from '@/admin-web-components'
import type { DeliveryAdminDto } from '@/backend-admin-sdk'
import { useSubmitDeliveryEventMutation } from '@/api/deliveriesApi'
import { EnumDeliveryEventType } from '../../../shared-types'
import { CANCELLED_BY_TO_HUMAN, CancelledBy, wasAcceptedWhenCancelled } from '../utils/cancellationDisplay'

// The order the choices appear in: the co-op's own decision first, as the backend's default.
const CHOICES: CancelledBy[] = ['COOP', 'RESTAURANT', 'CUSTOMER']

// Spec 0015, AC-5: an admin's cancel always says who asked, because it decides whether the
// restaurant is charged. The rider who holds the job is paid whichever it is.
export const CancelDeliveryDialog: React.FC<{ delivery: DeliveryAdminDto }> = ({ delivery }) => {
  const [open, setOpen] = useState(false)
  const [cancelledBy, setCancelledBy] = useState<CancelledBy>('COOP')
  const [errorText, setErrorText] = useState<string | null>(null)
  // The opening button: focus goes back to it when the dialog closes (adminweb AGENTS.md gotcha).
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [submitDeliveryEvent, { isLoading }] = useSubmitDeliveryEventMutation()
  const { toast } = useToast()

  // A rider already holds the job when its status is one of the ongoing ones.
  const riderHoldsIt = wasAcceptedWhenCancelled(delivery.status as string)

  const handleOpenChange = (next: boolean) => {
    if (isLoading) return
    if (next) {
      setCancelledBy('COOP')
      setErrorText(null)
    }
    setOpen(next)
  }

  const handleCancel = async () => {
    setErrorText(null)
    try {
      await submitDeliveryEvent({
        deliveryId: delivery.id,
        eventType: EnumDeliveryEventType.CANCELED,
        cancelledBy,
      }).unwrap()
      toast({ title: 'Delivery cancelled.' })
      setOpen(false)
    } catch (error: any) {
      setErrorText(error?.message || 'The delivery could not be cancelled. Try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button ref={triggerRef} type="button" variant="outline" size="sm" className="shrink-0">
          Cancel delivery
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          triggerRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>Cancel delivery</DialogTitle>
          <DialogDescription>
            {riderHoldsIt
              ? 'A rider holds this job: they are paid under the co-op’s cancelled job pay, whoever asked.'
              : 'No rider holds this job yet: nobody is paid or charged.'}
          </DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-2 py-2">
          <legend className="text-sm font-medium mb-1">Who asked for the cancellation?</legend>
          {CHOICES.map((choice) => (
            <label key={choice} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="cancelledBy"
                value={choice}
                checked={cancelledBy === choice}
                onChange={() => setCancelledBy(choice)}
              />
              {CANCELLED_BY_TO_HUMAN[choice]}
            </label>
          ))}
          {riderHoldsIt && cancelledBy === 'RESTAURANT' ? (
            <p className="text-sm text-muted-foreground" role="note">
              The restaurant is charged the delivery’s price for cancelling after a rider accepted.
            </p>
          ) : null}
        </fieldset>
        {errorText ? (
          <p className="text-sm text-destructive" role="alert">
            {errorText}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isLoading} onClick={() => handleOpenChange(false)}>
            Keep it
          </Button>
          <Button type="button" variant="destructive" disabled={isLoading} onClick={handleCancel}>
            {isLoading ? 'Cancelling…' : 'Cancel delivery'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
