import React, { useState, useEffect } from 'react'
import {
  BOX_OVER_CAPACITY_WARNING_ID,
  BoxOverCapacity,
  BoxOverCapacityWarning,
  boxOverCapacityOf,
  overCapacityConfirmed,
} from './BoxOverCapacityWarning'
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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@/admin-web-components'
import type { DeliveryAdminDto } from '@/backend-admin-sdk'
import { useReassignDeliveryMutation } from '@/api/deliveriesApi'
import { useGetAllCouriersQuery } from '@/api/couriersApi'
import { useGetInstanceConfigQuery } from '@/api/configApi'
import { listPayoutPolicies, previewReassignmentPayout } from '@/utils/reassignmentPayout'
import { formatMoney } from '@/utils/formatMoney'

const ONGOING_DELIVERY_STATUSES: string[] = [
  'ACCEPTED',
  'DISPATCHED',
  'COURIER_ARRIVED_AT_PICKUP_LOCATION',
  'PICKED_UP',
  'ON_THE_WAY',
  'COURIER_ARRIVED_AT_DROPOFF_LOCATION',
]

// Mirrors DELIVERY_ONGOING_STATUSES in opencourier-backend/src/shared-types/stateMachine.ts:98.
// ASSIGNING_COURIER is deliberately absent — AssignCourierCell already covers that state.
export function canReassignDelivery(delivery: DeliveryAdminDto): boolean {
  if (!delivery.courierId) {
    return false
  }
  return ONGOING_DELIVERY_STATUSES.includes(delivery.status as string)
}

interface ReassignCourierDialogProps {
  delivery: DeliveryAdminDto
}

// Modal dialog allowing admins to reassign an ongoing delivery to a new rider and calculate compensation.
export const ReassignCourierDialog: React.FC<ReassignCourierDialogProps> = ({
  delivery,
}) => {
  const [open, setOpen] = useState(false)
  const [newCourierId, setNewCourierId] = useState<string>('')
  const [selectedPolicy, setSelectedPolicy] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  // Spec 0043 (AC-6): set when the backend said the new rider's box would overfill; the next tap confirms.
  const [overCapacity, setOverCapacity] = useState<BoxOverCapacity | null>(null)
  // The admin's tick under the warning; only with it does the next press confirm (review fix).
  const [confirmChecked, setConfirmChecked] = useState(false)
  // The warning shown is about the rider now chosen; then the button waits for the tick.
  const warningForChosen = overCapacity !== null && overCapacity.courierId === newCourierId

  const { toast } = useToast()
  const [reassignDelivery, { isLoading }] = useReassignDeliveryMutation()

  const { data: couriers = [], isLoading: couriersLoading } = useGetAllCouriersQuery(undefined, {
    skip: !open,
  })

  const { data: config } = useGetInstanceConfigQuery({}, { skip: !open })

  const policyOptions = listPayoutPolicies(
    config?.reassignmentPayoutPolicies,
    config?.reassignmentPayoutDefaultPolicy,
  )

  useEffect(() => {
    if (open) {
      setNewCourierId('')
      setMessage('')
      setOverCapacity(null)
      setConfirmChecked(false)
      const options = listPayoutPolicies(
        config?.reassignmentPayoutPolicies,
        config?.reassignmentPayoutDefaultPolicy,
      )
      const defaultPol = options.find((p) => p.isDefault)?.key || options[0]?.key || ''
      setSelectedPolicy(defaultPol)
    }
  }, [open, config])

  if (!canReassignDelivery(delivery)) {
    return null
  }

  const currentCourier = couriers.find((c) => c.id === delivery.courierId)
  const currentCourierName = currentCourier
    ? `${currentCourier.firstName} ${currentCourier.lastName}`.trim()
    : (delivery.courierId ?? '')

  // Spec 0051 (cross check 14, row 108 review): a deactivated rider is never offered as a choice.
  const availableCouriers = couriers.filter((c) => c.id !== delivery.courierId && !c.deactivatedAt)

  // The SDK types this `number | null`, but its FromJSON copies the key with no default, so a
  // response that omits it leaves `undefined` here. This is the piece-rate a dropped rider is
  // paid from: both cases stay checked, and the `as` widening is what keeps TypeScript
  // agreeing the `=== undefined` test below is real.
  const totalCompensation = delivery.totalCompensation as number | null | undefined

  const preview = previewReassignmentPayout(
    config?.reassignmentPayoutPolicies,
    config?.reassignmentPayoutDefaultPolicy,
    selectedPolicy || undefined,
    totalCompensation,
  )

  const currencyCode = delivery.currencyCode
  const formattedAmount = formatMoney(preview.ok ? preview.amount : 0, currencyCode) ?? ''
  const formattedTotal = formatMoney(totalCompensation ?? 0, currencyCode) ?? ''

  const handleReassign = async () => {
    if (!newCourierId || !preview.ok) return

    try {
      await reassignDelivery({
        deliveryId: delivery.id,
        courierId: newCourierId,
        payoutPolicy: selectedPolicy,
        message: message.trim() || undefined,
        confirmOverCapacity: overCapacityConfirmed(overCapacity, newCourierId, confirmChecked),
      }).unwrap()

      const amountText = formattedAmount
      toast({
        title: `Delivery reassigned — ${currentCourierName} awarded ${amountText}`,
      })

      setOpen(false)
    } catch (err: any) {
      // The rider choice is locked while the request runs, so this answer is about `newCourierId`.
      const over = boxOverCapacityOf(err, newCourierId)
      if (over) {
        setOverCapacity(over)
        setConfirmChecked(false)
        return
      }
      toast({
        title: 'Reassignment failed',
        description: err?.message || 'An error occurred during rider reassignment.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="shrink-0">
            Reassign Rider
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Reassign Rider</DialogTitle>
            <DialogDescription>
              Reassign delivery <span className="font-mono text-xs">{delivery.id}</span> to another rider and calculate compensation for the dropped rider.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Current rider</Label>
              <div className="font-medium text-sm mt-0.5">{currentCourierName}</div>
            </div>

            <div className="space-y-1">
              <Label>New rider</Label>
              <Select
                // Locked while a request runs, so an answer always belongs to the rider on screen.
                disabled={couriersLoading || isLoading}
                value={newCourierId}
                onValueChange={(value) => {
                  setNewCourierId(value)
                  // Another rider: their box is asked about afresh.
                  setOverCapacity(null)
                  setConfirmChecked(false)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={couriersLoading ? 'Loading riders…' : 'Select replacement rider'} />
                </SelectTrigger>
                <SelectContent>
                  {availableCouriers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                      {c.phoneNumber ? ` · ${c.phoneNumber}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Payout policy for dropped rider</Label>
              <Select value={selectedPolicy} onValueChange={setSelectedPolicy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payout policy" />
                </SelectTrigger>
                <SelectContent>
                  {policyOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.key} — {opt.percent}% of piece-rate {opt.isDefault ? '(default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/40 p-3 rounded-md text-sm border">
              <Label className="text-xs text-muted-foreground block mb-1">Compensation Preview</Label>
              {!preview.ok ? (
                <div className="text-destructive font-medium">{preview.reason}</div>
              ) : totalCompensation === null || totalCompensation === undefined ? (
                <div>This Delivery has no recorded piece-rate, so the award is 0.</div>
              ) : (
                <div>
                  {currentCourierName} will be awarded{' '}
                  <span className="font-semibold">{formattedAmount}</span> ({preview.percent}% of the {formattedTotal} piece-rate).
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="reassign-reason">Reason — recorded on the DeliveryEvent</Label>
              <Input
                id="reassign-reason"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Moped flat tire mid-flight"
              />
            </div>
          </div>

          <BoxOverCapacityWarning
            value={warningForChosen ? overCapacity : null}
            checked={confirmChecked}
            onCheckedChange={setConfirmChecked}
          />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={warningForChosen ? 'destructive' : 'default'}
              disabled={isLoading || !newCourierId || !preview.ok || (warningForChosen && !confirmChecked)}
              aria-describedby={warningForChosen ? BOX_OVER_CAPACITY_WARNING_ID : undefined}
              onClick={handleReassign}
            >
              {isLoading ? <Spinner className="mr-2" /> : null}
              {warningForChosen ? 'Reassign anyway' : 'Reassign rider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
