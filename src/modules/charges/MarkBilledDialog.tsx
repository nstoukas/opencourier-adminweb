import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useFormat } from '@/i18n/useFormat'
import { useServerText } from '@/i18n/useServerText'
import { useAppDispatch } from '@/ui-shared-utils'
import { athensDayTime } from '@/utils/athensMonth'
import { adminOrderLabel, reasonText } from './chargeWording'

export const REFERENCE_MAX = 60

// What went wrong, kept as facts rather than words, so the message is written in the language shown
// now. A union type (`|`): either someone else billed some of the lines (with their names, which may
// be empty), or the server refused for another reason (its error, worded by errorText).
type BillError = { kind: 'alreadyBilled'; names: string[] } | { kind: 'server'; error: unknown }

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
  const [error, setError] = useState<BillError | null>(null)
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // useFormat gives money in the reader's language.
  const f = useFormat()
  // errorText: the server's refusal in the reader's language, else the fallback given.
  const { errorText } = useServerText()

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
        setError({ kind: 'alreadyBilled', names })
        return
      }
      setError({ kind: 'server', error: err })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isLoading && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>{t('charges.partnerMonth.markAsBilled')}</DialogTitle>
          <DialogDescription>{t('charges.markBilled.description')}</DialogDescription>
        </DialogHeader>

        {unbilled.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('charges.markBilled.allBilled')}</p>
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
                      {reasonText(t, line)}
                    </span>
                    <span className="tabular-nums font-medium">{f.money(line.amount, line.currencyCode)}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        <Field>
          <FieldLabel htmlFor="bill-reference">{t('charges.markBilled.reference')}</FieldLabel>
          <Input
            id="bill-reference"
            value={reference}
            maxLength={REFERENCE_MAX + 20}
            onChange={(event) => setReference(event.target.value)}
            aria-invalid={referenceTooLong}
          />
          <FieldDescription>
            {referenceTooLong
              ? t('charges.atMostCharacters', { max: REFERENCE_MAX })
              : t('charges.markBilled.referenceHint')}
          </FieldDescription>
        </Field>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error.kind === 'server'
              ? errorText(error.error, t('charges.markBilled.saveFailed'))
              : error.names.length > 0
                ? t('charges.markBilled.someoneBilled', { names: error.names.join(', ') })
                : t('charges.markBilled.someoneBilledUnknown')}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isLoading} onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={confirm} disabled={isLoading || ticked.length === 0 || referenceTooLong}>
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {t('charges.markBilled.confirm', { count: ticked.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
