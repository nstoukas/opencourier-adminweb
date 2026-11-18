import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Spinner,
} from '@/admin-web-components'
import type { PartnerChargeBilledLineDto } from '@/backend-admin-sdk'
import { alreadyBilledIds, refreshPartnerCharges, useCreatePartnerBillMutation } from '@/api/partnerChargeApi'
import { backendMessage } from '@/modules/couriers/courierAccountRules'
import { useAppDispatch } from '@/ui-shared-utils'
import { athensDayTime } from '@/utils/athensMonth'
import { formatMoney } from '@/utils/formatMoney'
import { adminOrderLabel, reasonText } from './chargeWording'

export const REFERENCE_MAX = 60

// Spec 0036, AC-5, AC-6. Every unbilled line starts ticked; untick what this invoice does not cover.
// One bill is written for the ticked lines, all or nothing. If another admin billed one of them a
// moment earlier, nothing is written: the lines are read again and the dialog says which ones.
export function MarkBilledDialog({
  open,
  partnerId,
  month,
  unbilled,
  onOpenChange,
  onSaved,
  onCloseAutoFocus,
}: {
  open: boolean
  partnerId: string
  month: string
  // The month's lines still unbilled, as the page last read them.
  unbilled: PartnerChargeBilledLineDto[]
  onOpenChange: (open: boolean) => void
  // Called once the bill is saved, before the dialog closes.
  onSaved?: () => void
  onCloseAutoFocus: (event: Event) => void
}) {
  const [createBill, { isLoading }] = useCreatePartnerBillMutation()
  const dispatch = useAppDispatch()
  // The ids the admin unticked; every other unbilled line counts as ticked, so a line that arrives
  // after a reload starts ticked too.
  const [unticked, setUnticked] = useState<Set<string>>(new Set())
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)

  // A fresh start each time the dialog opens.
  useEffect(() => {
    if (open) {
      setUnticked(new Set())
      setReference('')
      setError(null)
    }
  }, [open])

  const ticked = useMemo(() => unbilled.filter((line) => !unticked.has(line.id)), [unbilled, unticked])
  const trimmed = reference.trim()
  const referenceTooLong = trimmed.length > REFERENCE_MAX

  const toggle = (id: string, checked: boolean) =>
    setUnticked((current) => {
      const next = new Set(current)
      if (checked) next.delete(id)
      else next.add(id)
      return next
    })

  const confirm = async () => {
    setError(null)
    try {
      await createBill({
        partnerId,
        month,
        chargeIds: ticked.map((line) => line.id),
        ...(trimmed ? { reference: trimmed } : {}),
      }).unwrap()
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      const billed = alreadyBilledIds(err)
      if (billed !== null) {
        // Nothing was written. Read the lines again; the billed ones drop out of this list.
        dispatch(refreshPartnerCharges())
        // Time and order, since one order can carry more than one charge.
        const names = unbilled
          .filter((line) => billed.includes(line.id))
          .map((line) => `${adminOrderLabel(line)} (${athensDayTime(line.happenedAt)})`)
        setError(
          names.length > 0
            ? `Nothing was billed: someone else just billed ${names.join(', ')}. The list is up to date now; check it and confirm again.`
            : 'Nothing was billed: some of these lines were just billed by someone else. The list is up to date now.'
        )
        return
      }
      setError(backendMessage(err, 'The bill could not be saved. Try again in a moment.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isLoading && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>Mark as billed</DialogTitle>
          <DialogDescription>
            Tick the lines your invoice covers. Lines you untick stay unbilled and can go in a later bill.
          </DialogDescription>
        </DialogHeader>

        {unbilled.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every line of this month is billed.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {unbilled.map((line) => {
              const id = `bill-line-${line.id}`
              return (
                <li key={line.id} className="flex items-start gap-3 py-2">
                  <Checkbox
                    id={id}
                    className="mt-0.5"
                    checked={!unticked.has(line.id)}
                    onCheckedChange={(checked) => toggle(line.id, checked === true)}
                  />
                  <label htmlFor={id} className="flex flex-1 flex-wrap justify-between gap-x-4 text-sm">
                    <span>
                      <span className="tabular-nums">{athensDayTime(line.happenedAt)}</span>
                      {' · '}
                      {adminOrderLabel(line)}
                      {' · '}
                      {reasonText(line)}
                    </span>
                    <span className="tabular-nums font-medium">{formatMoney(line.amount, line.currencyCode)}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        <Field>
          <FieldLabel htmlFor="bill-reference">Invoice number (optional)</FieldLabel>
          <Input
            id="bill-reference"
            value={reference}
            maxLength={REFERENCE_MAX + 20}
            onChange={(event) => setReference(event.target.value)}
            aria-invalid={referenceTooLong}
          />
          <FieldDescription>
            {referenceTooLong ? `At most ${REFERENCE_MAX} characters.` : 'The number of the invoice you sent, so the two can be matched.'}
          </FieldDescription>
        </Field>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isLoading} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={confirm} disabled={isLoading || ticked.length === 0 || referenceTooLong}>
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {ticked.length === 1 ? 'Confirm 1 line' : `Confirm ${ticked.length} lines`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
