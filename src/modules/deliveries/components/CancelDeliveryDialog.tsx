import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { CancelledBy, cancelledByText, wasAcceptedWhenCancelled } from '../utils/cancellationDisplay'
import { useServerText } from '@/i18n/useServerText'
import { keyMessage, showMessage, textMessage, type ShownMessage } from '@/i18n/shownMessage'

// The order the choices appear in: the co-op's own decision first, as the backend's default.
const CHOICES: CancelledBy[] = ['COOP', 'RESTAURANT', 'CUSTOMER']

// Spec 0015, AC-5: an admin's cancel always says who asked, because it decides whether the
// restaurant is charged. The rider who holds the job is paid whichever it is.
export const CancelDeliveryDialog: React.FC<{ delivery: DeliveryAdminDto }> = ({ delivery }) => {
  const [open, setOpen] = useState(false)
  const [cancelledBy, setCancelledBy] = useState<CancelledBy>('COOP')
  // The refusal kept as a key or the server's words (src/i18n/shownMessage.ts), so a language switch
  // reaches a message already on screen.
  const [failure, setFailure] = useState<ShownMessage | null>(null)
  // The opening button: focus goes back to it when the dialog closes (adminweb AGENTS.md gotcha).
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [submitDeliveryEvent, { isLoading }] = useSubmitDeliveryEventMutation()
  const { toast } = useToast()
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // errorText: the server's refusal in the reader's language, else the fallback given.
  const { errorText } = useServerText()

  // A rider already holds the job when its status is one of the ongoing ones.
  const riderHoldsIt = wasAcceptedWhenCancelled(delivery.status as string)

  const handleOpenChange = (next: boolean) => {
    if (isLoading) return
    if (next) {
      setCancelledBy('COOP')
      setFailure(null)
    }
    setOpen(next)
  }

  const handleCancel = async () => {
    setFailure(null)
    try {
      await submitDeliveryEvent({
        deliveryId: delivery.id,
        eventType: EnumDeliveryEventType.CANCELED,
        cancelledBy,
      }).unwrap()
      toast({ title: t('deliveries.cancelDialog.done') })
      setOpen(false)
    } catch (error: any) {
      // The server's refusal in the reader's language when it has one; else our own sentence, kept as a
      // key. An empty fallback tells the two apart.
      const serverWords = errorText(error, '')
      setFailure(serverWords ? textMessage(serverWords) : keyMessage('deliveries.cancelDialog.failed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button ref={triggerRef} type="button" variant="outline" size="sm" className="shrink-0">
          {t('deliveries.cancelDialog.button')}
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
          <DialogTitle>{t('deliveries.cancelDialog.button')}</DialogTitle>
          <DialogDescription>
            {riderHoldsIt ? t('deliveries.cancelDialog.riderHolds') : t('deliveries.cancelDialog.noRider')}
          </DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-2 py-2">
          <legend className="text-sm font-medium mb-1">{t('deliveries.cancelDialog.whoAsked')}</legend>
          {CHOICES.map((choice) => (
            <label key={choice} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="cancelledBy"
                value={choice}
                checked={cancelledBy === choice}
                onChange={() => setCancelledBy(choice)}
              />
              {cancelledByText(choice, t)}
            </label>
          ))}
          {riderHoldsIt && cancelledBy === 'RESTAURANT' ? (
            <p className="text-sm text-muted-foreground" role="note">
              {t('deliveries.cancelDialog.restaurantCharged')}
            </p>
          ) : null}
        </fieldset>
        {failure ? (
          <p className="text-sm text-destructive" role="alert">
            {showMessage(failure, t)}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isLoading} onClick={() => handleOpenChange(false)}>
            {t('deliveries.cancelDialog.keep')}
          </Button>
          <Button type="button" variant="destructive" disabled={isLoading} onClick={handleCancel}>
            {isLoading ? t('deliveries.cancelDialog.cancelling') : t('deliveries.cancelDialog.button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
