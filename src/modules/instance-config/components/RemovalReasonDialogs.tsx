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
import { useTranslation } from 'react-i18next'
import { useServerText } from '@/i18n/useServerText'
import { isMessageKey, keyMessage, showMessage, textMessage, type ShownMessage } from '@/i18n/shownMessage'

// The same limit as the backend's `label` and `labelEl` columns.
const LABEL_MAX = 60

// The server's own words when it sent some (a refusal such as "the last reason cannot be removed"), else our
// sentence kept as its key, so it is translated when drawn. `errorText` is useServerText's.
function errorMessage(errorText: (error: unknown, fallback: string) => string, err: unknown, fallbackKey: string): ShownMessage {
  const words = errorText(err, fallbackKey)
  return words === fallbackKey ? keyMessage(fallbackKey) : textMessage(words)
}

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
// Since spec 0054 (AC-7) each reason has its Greek and its English, both required whenever the dialog
// saves: an old reason with no Greek opens with an empty Greek box, to be filled before it saves again.
export function RemovalReasonDialog({ open, reason, onOpenChange, onCloseAutoFocus }: DialogProps) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const { errorText } = useServerText()
  const [createReason, { isLoading: creating }] = useCreateRemovalReasonMutation()
  const [updateReason, { isLoading: updating }] = useUpdateRemovalReasonMutation()
  const [label, setLabel] = useState('')
  const [labelEl, setLabelEl] = useState('')
  const [paidToRider, setPaidToRider] = useState(true)
  const [chargedToRestaurant, setChargedToRestaurant] = useState(false)
  const [needsNote, setNeedsNote] = useState(false)
  const [position, setPosition] = useState('')
  // A key or the server's words, translated when drawn (shownMessage.ts).
  const [error, setError] = useState<ShownMessage | null>(null)
  const saving = creating || updating
  // True while the message on show is "type it in both languages": the empty box is then marked.
  const missingLabel = isMessageKey(error, 'settings.removalReasons.labelMissing')

  // Each open starts from the reason being edited, or the new reason's defaults (paid, not charged).
  useEffect(() => {
    if (!open) return
    setLabel(reason?.label ?? '')
    setLabelEl(reason?.labelEl ?? '')
    setPaidToRider(reason?.paidToRider ?? true)
    setChargedToRestaurant(reason?.chargedToRestaurant ?? false)
    setNeedsNote(reason?.needsNote ?? false)
    setPosition(reason ? String(reason.position) : '')
    setError(null)
  }, [open, reason])

  const save = async () => {
    const trimmed = label.trim()
    const trimmedEl = labelEl.trim()
    if (trimmed === '' || trimmedEl === '') return setError(keyMessage('settings.removalReasons.labelMissing'))
    const fields = { label: trimmed, labelEl: trimmedEl, paidToRider, chargedToRestaurant, needsNote }
    const positionNumber = Number(position.trim())
    if (reason && (position.trim() === '' || !Number.isInteger(positionNumber))) {
      return setError(keyMessage('settings.removalReasons.positionWhole'))
    }
    setError(null)
    try {
      if (reason) await updateReason({ id: reason.id, input: { ...fields, position: positionNumber } }).unwrap()
      else await createReason(fields).unwrap()
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(errorText, err, 'settings.removalReasons.saveFailed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>{t(reason ? 'settings.removalReasons.editTitle' : 'settings.removalReasons.addTitle')}</DialogTitle>
          <DialogDescription>{t('settings.removalReasons.dialogDescription')}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          {/* The Greek and the English side by side; both are required to save. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="removal-reason-label-el">{t('settings.removalReasons.labelEl')}</FieldLabel>
              <Input
                id="removal-reason-label-el"
                lang="el"
                value={labelEl}
                maxLength={LABEL_MAX}
                aria-invalid={missingLabel && labelEl.trim() === '' ? true : undefined}
                onChange={(event) => setLabelEl(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="removal-reason-label">{t('settings.removalReasons.labelEn')}</FieldLabel>
              <Input
                id="removal-reason-label"
                lang="en"
                value={label}
                maxLength={LABEL_MAX}
                aria-invalid={missingLabel && label.trim() === '' ? true : undefined}
                onChange={(event) => setLabel(event.target.value)}
              />
            </Field>
          </div>
          <FieldDescription>{t('settings.removalReasons.labelHelp', { max: LABEL_MAX })}</FieldDescription>
          <ReasonSwitch
            id="removal-reason-paid"
            label={t('settings.removalReasons.paid')}
            description={t('settings.removalReasons.paidHelp')}
            checked={paidToRider}
            onChange={setPaidToRider}
          />
          <ReasonSwitch
            id="removal-reason-charged"
            label={t('settings.removalReasons.charged')}
            description={t('settings.removalReasons.chargedHelp')}
            checked={chargedToRestaurant}
            onChange={setChargedToRestaurant}
          />
          <ReasonSwitch
            id="removal-reason-note"
            label={t('settings.removalReasons.needsNote')}
            description={t('settings.removalReasons.noteHelp')}
            checked={needsNote}
            onChange={setNeedsNote}
          />
          {reason ? (
            <Field>
              <FieldLabel htmlFor="removal-reason-position">{t('settings.removalReasons.position')}</FieldLabel>
              <Input
                id="removal-reason-position"
                type="number"
                step={1}
                value={position}
                onChange={(event) => setPosition(event.target.value)}
              />
              <FieldDescription>{t('settings.removalReasons.positionHelp')}</FieldDescription>
            </Field>
          ) : (
            <FieldDescription>{t('settings.removalReasons.newGoesLast')}</FieldDescription>
          )}
        </FieldGroup>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {showMessage(error, t)}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {t(reason ? 'settings.removalReasons.save' : 'settings.removalReasons.add')}
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
  onRemoved,
  onCloseAutoFocus,
}: {
  reason: RemovalReasonAdminDto
  onClose: () => void
  onRemoved: () => void
  onCloseAutoFocus: (event: Event) => void
}) {
  const { t, i18n } = useTranslation()
  const { errorText } = useServerText()
  const [removeReason, { isLoading }] = useRemoveRemovalReasonMutation()
  const [error, setError] = useState<ShownMessage | null>(null)
  // The reason as the reader's language names it (written by the co-op, so shown as written, not translated).
  const name = reasonName(reason, i18n.language)

  const confirm = async () => {
    setError(null)
    try {
      await removeReason({ id: reason.id }).unwrap()
      onRemoved()
    } catch (err) {
      setError(errorMessage(errorText, err, 'settings.removalReasons.removeFailed'))
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isLoading && onClose()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('settings.removalReasons.removeTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('settings.removalReasons.removeDescription', { label: name })}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {showMessage(error, t)}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
          {/* A plain Button, so the dialog stays open until the removal is done. */}
          <Button type="button" variant="destructive" disabled={isLoading} onClick={confirm}>
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {t('settings.removalReasons.remove')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// A reason's name in the reader's language, else the other one (spec 0054, AC-7): Greek first for a Greek
// reader, English first otherwise. Both are the co-op's own words, never translated by the app.
export function reasonName(reason: Pick<RemovalReasonAdminDto, 'label' | 'labelEl'>, language: string): string {
  return language === 'el' ? reason.labelEl || reason.label : reason.label || reason.labelEl || ''
}
