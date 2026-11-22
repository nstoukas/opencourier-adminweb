import { useAssignDeliveryToCourierMutation } from '@/api/deliveriesApi'
import { useGetAllCouriersQuery } from '@/api/couriersApi'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Spinner,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '../../../admin-web-components'
import type { DeliveryAdminDto } from '../../../backend-admin-sdk'
import { DeliveryAdminDtoStatusEnum } from '../../../backend-admin-sdk'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServerText } from '@/i18n/useServerText'
import {
  BOX_OVER_CAPACITY_WARNING_ID,
  BoxOverCapacity,
  BoxOverCapacityWarning,
  boxOverCapacityOf,
  overCapacityConfirmed,
} from './BoxOverCapacityWarning'

// Only the fields these read, so the Dispatch board can pass its row without fetching the delivery
// (spec 0034, AC-4). `Pick` makes a type from a few fields of another type.
type AssignableDelivery = Pick<DeliveryAdminDto, 'id' | 'status' | 'courierId'>

export function isDeliveryAwaitingCourierAssignment(delivery: AssignableDelivery): boolean {
  return (
    delivery.status === DeliveryAdminDtoStatusEnum.AssigningCourier && !delivery.courierId
  )
}

export function AssignCourierCell({ delivery }: { delivery: AssignableDelivery }) {
  const [open, setOpen] = useState(false)
  const [courierId, setCourierId] = useState<string>()
  // Spec 0043 (AC-6): set when the backend said this rider's box would overfill; the next tap confirms.
  const [overCapacity, setOverCapacity] = useState<BoxOverCapacity | null>(null)
  // The admin's tick under the warning; only with it does the next press confirm (review fix).
  const [confirmChecked, setConfirmChecked] = useState(false)
  const { toast } = useToast()
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // errorText: the server's refusal in the reader's language, else our own sentence.
  const { errorText } = useServerText()
  const [assignCourier, { isLoading }] = useAssignDeliveryToCourierMutation()
  const { data: couriers = [], isLoading: couriersLoading } = useGetAllCouriersQuery(undefined, {
    skip: !open,
  })

  const canAssign = isDeliveryAwaitingCourierAssignment(delivery)
  // The warning shown is about the rider now chosen; then the button waits for the tick.
  const warningForChosen = overCapacity !== null && overCapacity.courierId === courierId

  // Every way the dialog closes clears the choice and any warning, so reopening never confirms.
  const close = () => {
    setOpen(false)
    setCourierId(undefined)
    setOverCapacity(null)
    setConfirmChecked(false)
  }

  const handleAssign = async () => {
    if (!courierId) {
      toast({ title: t('deliveries.assign.chooseCourier'), variant: 'destructive' })
      return
    }
    try {
      await assignCourier({
        deliveryId: delivery.id,
        courierId,
        confirmOverCapacity: overCapacityConfirmed(overCapacity, courierId, confirmChecked),
      }).unwrap()
      toast({ title: t('deliveries.assign.assigned') })
      close()
    } catch (error) {
      // The rider choice is locked while the request runs, so this answer is about `courierId`.
      const over = boxOverCapacityOf(error, courierId)
      if (over) {
        setOverCapacity(over)
        setConfirmChecked(false)
        return
      }
      toast({
        title: t('deliveries.assign.failed'),
        description: errorText(error, t('deliveries.assign.failedHint')),
        variant: 'destructive',
      })
    }
  }

  if (!canAssign) {
    return null
  }

  return (
    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) setOpen(true)
          else close()
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="shrink-0 whitespace-normal">
            {t('deliveries.assign.button')}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t('deliveries.assign.button')}</DialogTitle>
            <DialogDescription>
              {t('deliveries.assign.description')}{' '}
              <span className="font-mono text-xs">{delivery.id}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>{t('deliveries.assign.courier')}</Label>
            <Select
              // Locked while a request runs, so an answer always belongs to the rider on screen.
              disabled={couriersLoading || isLoading}
              value={courierId ?? ''}
              onValueChange={(v) => {
                setCourierId(v)
                // Another rider: their box is asked about afresh.
                setOverCapacity(null)
                setConfirmChecked(false)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={couriersLoading ? t('common.loading') : t('deliveries.assign.selectCourier')} />
              </SelectTrigger>
              <SelectContent>
                {/* Spec 0051 (cross check 14, row 108 review): a deactivated rider is never offered as a choice. */}
                {couriers.filter((c) => !c.deactivatedAt).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                    {c.phoneNumber ? ` · ${c.phoneNumber}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <BoxOverCapacityWarning
            value={warningForChosen ? overCapacity : null}
            checked={confirmChecked}
            onCheckedChange={setConfirmChecked}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant={warningForChosen ? 'destructive' : 'default'}
              disabled={isLoading || !courierId || (warningForChosen && !confirmChecked)}
              aria-describedby={warningForChosen ? BOX_OVER_CAPACITY_WARNING_ID : undefined}
              onClick={() => void handleAssign()}
            >
              {isLoading ? <Spinner className="mr-2" /> : null}
              {warningForChosen ? t('deliveries.assign.anyway') : t('deliveries.assign.button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
