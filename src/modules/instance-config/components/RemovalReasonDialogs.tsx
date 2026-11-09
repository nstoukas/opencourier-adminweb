import React, { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  Input,
  Spinner,
  Switch,
} from '@/admin-web-components'
import type { RemovalReasonAdminDto } from '@/backend-admin-sdk'
import {
  useCreateRemovalReasonMutation,
  useRemoveRemovalReasonMutation,
  useUpdateRemovalReasonMutation,
} from '@/api/removalRequestApi'
import { backendMessage } from '@/modules/couriers/courierAccountRules'

// The same limit as the backend's `label` column.
const LABEL_MAX = 60

// One labelled on/off switch of the dialog.
function ReasonSwitch({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Field>
      <div className="flex items-center gap-3">
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
      </div>
      <FieldDescription>{description}</FieldDescription>
    </Field>
  )
}

type DialogProps = {
  open: boolean
  // Add when null, Edit when a reason. Kept apart from `open` by the card, so the title does not
  // change while the dialog animates closed (adminweb AGENTS.md).
  reason: RemovalReasonAdminDto | null
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus: (event: Event) => void
}

// Add a reason or edit one (spec 0035, AC-2). A new reason takes the end of the list, so its position
// is only asked for when editing. A request already sent keeps its own copy of the reason.
export function RemovalReasonDialog({ open, reason, onOpenChange, onCloseAutoFocus }: DialogProps) {
  const [createReason, { isLoading: creating }] = useCreateRemovalReasonMutation()
  const [updateReason, { isLoading: updating }] = useUpdateRemovalReasonMutation()
  const [label, setLabel] = useState('')
  const [paidToRider, setPaidToRider] = useState(true)
  const [chargedToRestaurant, setChargedToRestaurant] = useState(false)
  const [needsNote, setNeedsNote] = useState(false)
  const [position, setPosition] = useState('')
  const [error, setError] = useState<string | null>(null)
  const saving = creating || updating

  // Each open starts from the reason being edited, or the new reason's defaults (paid, not charged).
  useEffect(() => {
    if (!open) return
    setLabel(reason?.label ?? '')
    setPaidToRider(reason?.paidToRider ?? true)
    setChargedToRestaurant(reason?.chargedToRestaurant ?? false)
    setNeedsNote(reason?.needsNote ?? false)
    setPosition(reason ? String(reason.position) : '')
    setError(null)
  }, [open, reason])

  const save = async () => {
    const trimmed = label.trim()
    if (trimmed === '') return setError('Type what the rider reads for this reason.')
    const fields = { label: trimmed, paidToRider, chargedToRestaurant, needsNote }
    const positionNumber = Number(position.trim())
    if (reason && (position.trim() === '' || !Number.isInteger(positionNumber))) {
      return setError('The position must be a whole number.')
    }
    setError(null)
    try {
      if (reason) await updateReason({ id: reason.id, input: { ...fields, position: positionNumber } }).unwrap()
      else await createReason(fields).unwrap()
      onOpenChange(false)
    } catch (err) {
      setError(backendMessage(err, 'The reason could not be saved. Try again in a moment.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>{reason ? 'Edit reason' : 'Add reason'}</DialogTitle>
          <DialogDescription>
            Riders see this list when they ask to come off an order. Requests already sent keep the reason as it read then.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="removal-reason-label">Reason</FieldLabel>
            <Input
              id="removal-reason-label"
              value={label}
              maxLength={LABEL_MAX}
              onChange={(event) => setLabel(event.target.value)}
            />
            <FieldDescription>What the rider reads. At most {LABEL_MAX} characters.</FieldDescription>
          </Field>
          <ReasonSwitch
            id="removal-reason-paid"
            label="Paid to the rider"
            description="The rider sees whether a reason is paid before sending."
            checked={paidToRider}
            onChange={setPaidToRider}
          />
          <ReasonSwitch
            id="removal-reason-charged"
            label="Charged to the restaurant"
            description="Bills the restaurant the same amount the rider would get. Never a delivery fee."
            checked={chargedToRestaurant}
            onChange={setChargedToRestaurant}
          />
          <ReasonSwitch
            id="removal-reason-note"
            label="Needs a note"
            description="The rider must say what happened before sending."
            checked={needsNote}
            onChange={setNeedsNote}
          />
          {reason ? (
            <Field>
              <FieldLabel htmlFor="removal-reason-position">Position</FieldLabel>
              <Input
                id="removal-reason-position"
                type="number"
                step={1}
                value={position}
                onChange={(event) => setPosition(event.target.value)}
              />
              <FieldDescription>Smaller numbers come first in the rider&apos;s list.</FieldDescription>
            </Field>
          ) : (
            <FieldDescription>A new reason goes to the end of the list.</FieldDescription>
          )}
        </FieldGroup>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {reason ? 'Save reason' : 'Add reason'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Asks first, naming the reason. The backend refuses to remove the last one, in words shown here.
export function RemoveRemovalReasonDialog({
  reason,
  onClose,
  onCloseAutoFocus,
}: {
  reason: RemovalReasonAdminDto
  onClose: () => void
  onCloseAutoFocus: (event: Event) => void
}) {
  const [removeReason, { isLoading }] = useRemoveRemovalReasonMutation()
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setError(null)
    try {
      await removeReason({ id: reason.id }).unwrap()
      onClose()
    } catch (err) {
      setError(backendMessage(err, 'The reason could not be removed. Try again in a moment.'))
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isLoading && onClose()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this reason?</AlertDialogTitle>
          <AlertDialogDescription>
            {reason.label}. Riders stop seeing it. Requests already sent keep it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          {/* A plain Button, so the dialog stays open until the removal is done. */}
          <Button type="button" variant="destructive" disabled={isLoading} onClick={confirm}>
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Remove reason
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
