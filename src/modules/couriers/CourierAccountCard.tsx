import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DetailList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Spinner,
  useToast,
} from '@/admin-web-components'
import type { CourierAccountChangeAdminDto, CourierAdminDto } from '@/backend-admin-sdk'
import {
  useDeactivateCourierMutation,
  useEditCourierDetailsMutation,
  useGetCourierAccountChangesQuery,
  useGetCourierAccountQuery,
  useReactivateCourierMutation,
} from '@/api/courierAccountApi'
import { useFormat } from '@/i18n/useFormat'
import { useServerText } from '@/i18n/useServerText'

// Spec 0051 (row 108, AC-6): a rider's account. The login email and the emergency contact, Deactivate or
// Reactivate, an edit of every detail, and the record of every account action, newest first. A person
// decides each of these; the record is what the rider sees too (as "the co-op").

export const REASON_MAX = 300

// The details the history names in words (couriers.field.* in the language files); any other field
// shows as the server named it.
const NAMED_FIELDS = new Set([
  'firstName',
  'lastName',
  'phoneNumber',
  'email',
  'emergencyContactName',
  'emergencyContactPhone',
  'deliverySetting',
])

// One history line in words, in the reader's language (`t` comes from the component's useTranslation).
// The reason and the values are the rider's or admin's own words, shown as written.
export function accountChangeText(change: CourierAccountChangeAdminDto, t: TFunction): string {
  switch (change.kind) {
    case 'DEACTIVATED':
      return change.reason
        ? t('couriers.account.change.deactivatedReason', { reason: change.reason })
        : t('couriers.account.change.deactivated')
    case 'REACTIVATED':
      return change.reason
        ? t('couriers.account.change.reactivatedReason', { reason: change.reason })
        : t('couriers.account.change.reactivated')
    case 'PASSWORD_CHANGED':
      return t('couriers.account.change.passwordChanged')
    // Spec 0050 (cross check 14): an admin downloaded the rider's statement ("2026-10 PDF").
    case 'STATEMENT_DOWNLOADED':
      return t('couriers.account.change.statementDownloaded', { what: change.newValue ?? '' })
    case 'FIELD_EDITED': {
      const field = change.field
        ? NAMED_FIELDS.has(change.field)
          ? t(`couriers.field.${change.field}`)
          : change.field
        : t('couriers.account.change.aDetail')
      const empty = t('couriers.account.change.empty')
      return t('couriers.account.change.fieldEdited', {
        field,
        before: change.oldValue ?? empty,
        after: change.newValue ?? empty,
      })
    }
    default:
      return change.kind
  }
}

function actorText(change: CourierAccountChangeAdminDto, t: TFunction): string {
  if (change.actorIsRider) return t('couriers.account.byRider')
  return change.actorEmail ? t('couriers.account.byEmail', { email: change.actorEmail }) : t('couriers.account.byAdmin')
}

type Props = { courier: CourierAdminDto; name: string }

export function CourierAccountCard({ courier, name }: Props) {
  // useTranslation gives t, which looks a key up in the reader's language; useFormat formats dates in it.
  const { t } = useTranslation()
  const f = useFormat()
  const accountQuery = useGetCourierAccountQuery({ id: courier.id })
  const changesQuery = useGetCourierAccountChangesQuery({ id: courier.id })
  const [dialog, setDialog] = useState<'deactivate' | 'reactivate' | 'edit' | null>(null)
  const actionRef = useRef<HTMLButtonElement>(null)
  const editRef = useRef<HTMLButtonElement>(null)
  const account = accountQuery.data
  const deactivated = Boolean(courier.deactivatedAt ?? account?.deactivatedAt)
  const changes = changesQuery.data ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('couriers.account.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {accountQuery.isError ? (
          <p className="text-destructive">{t('couriers.account.loadFailed')}</p>
        ) : (
          <DetailList
            items={[
              {
                label: t('couriers.account.title'),
                value: deactivated
                  ? account?.deactivatedAt
                    ? t('couriers.account.deactivatedOn', { date: f.dateTime(account.deactivatedAt) })
                    : t('couriers.account.deactivated')
                  : t('couriers.account.active'),
              },
              { label: t('couriers.field.email'), value: account?.email ?? t('common.dash') },
              {
                label: t('couriers.account.emergencyContact'),
                value:
                  account && (account.emergencyContactName || account.emergencyContactPhone)
                    ? [account.emergencyContactName, account.emergencyContactPhone].filter(Boolean).join(', ')
                    : t('couriers.account.noneGiven'),
              },
            ]}
          />
        )}
        <div className="flex flex-wrap gap-2">
          <Button ref={editRef} type="button" variant="outline" disabled={!account} onClick={() => setDialog('edit')}>
            {t('couriers.account.editDetails')}
          </Button>
          <Button
            ref={actionRef}
            type="button"
            variant={deactivated ? 'outline' : 'destructive'}
            onClick={() => setDialog(deactivated ? 'reactivate' : 'deactivate')}
          >
            {deactivated ? t('couriers.account.reactivate') : t('couriers.account.deactivate')}
          </Button>
        </div>

        <div>
          <h3 className="mb-2 font-medium">{t('couriers.account.history')}</h3>
          {changesQuery.isError ? (
            <p className="text-destructive">{t('couriers.account.historyFailed')}</p>
          ) : changes.length === 0 ? (
            <p className="text-muted-foreground">{t('couriers.account.noChanges')}</p>
          ) : (
            <ul className="space-y-1">
              {changes.map((change) => (
                <li key={change.id}>
                  <span className="text-muted-foreground">{f.dateTime(change.createdAt)}</span>
                  {` · ${accountChangeText(change, t)} `}
                  <span className="text-muted-foreground">{actorText(change, t)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <DeactivationDialog
        mode={dialog === 'deactivate' || dialog === 'reactivate' ? dialog : null}
        onClose={() => setDialog(null)}
        courierId={courier.id}
        name={name}
        returnFocusTo={actionRef}
      />
      {dialog === 'edit' && account ? (
        <EditDetailsDialog
          courier={courier}
          email={account.email ?? ''}
          emergencyContactName={account.emergencyContactName ?? ''}
          emergencyContactPhone={account.emergencyContactPhone ?? ''}
          onClose={() => setDialog(null)}
          returnFocusTo={editRef}
        />
      ) : null}
    </Card>
  )
}

// AC-1, AC-3: the confirm names the effects. A deactivation needs a reason (cross check 1).
function DeactivationDialog({
  mode,
  onClose,
  courierId,
  name,
  returnFocusTo,
}: {
  mode: 'deactivate' | 'reactivate' | null
  onClose: () => void
  courierId: string
  name: string
  returnFocusTo: React.RefObject<HTMLElement>
}) {
  const { t } = useTranslation()
  const { errorText } = useServerText()
  const { toast } = useToast()
  const [deactivate, deactivateState] = useDeactivateCourierMutation()
  const [reactivate, reactivateState] = useReactivateCourierMutation()
  const [reason, setReason] = useState('')
  // What the server threw, kept as it came: its words are worked out when drawn, in the current language.
  const [failure, setFailure] = useState<{ error: unknown } | null>(null)
  useEffect(() => {
    if (mode) {
      setReason('')
      setFailure(null)
    }
  }, [mode])
  const busy = deactivateState.isLoading || reactivateState.isLoading
  const trimmed = reason.trim()
  const canSubmit = mode === 'reactivate' || (trimmed.length > 0 && trimmed.length <= REASON_MAX)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!mode || !canSubmit || busy) return
    setFailure(null)
    try {
      if (mode === 'deactivate') {
        await deactivate({ id: courierId, reason: trimmed }).unwrap()
        toast({ title: t('couriers.account.toastDeactivated', { name }) })
      } else {
        await reactivate({ id: courierId, reason: trimmed || undefined }).unwrap()
        toast({ title: t('couriers.account.toastReactivated', { name }) })
      }
      onClose()
    } catch (err: unknown) {
      setFailure({ error: err })
    }
  }

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusTo.current?.focus()
        }}
      >
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>
              {mode === 'reactivate'
                ? t('couriers.account.reactivateTitle', { name })
                : t('couriers.account.deactivateTitle', { name })}
            </DialogTitle>
            <DialogDescription>
              {mode === 'reactivate'
                ? t('couriers.account.reactivateDescription')
                : t('couriers.account.deactivateDescription')}
            </DialogDescription>
          </DialogHeader>
          {failure ? (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {errorText(failure.error, t('couriers.account.saveFailed'))}
            </p>
          ) : null}
          <div className="space-y-1 py-4">
            <Label htmlFor="account-reason">
              {mode === 'reactivate' ? t('couriers.account.reasonOptional') : t('couriers.account.reason')}
            </Label>
            <Input
              id="account-reason"
              value={reason}
              maxLength={REASON_MAX}
              aria-describedby="account-reason-help"
              onChange={(e) => setReason(e.target.value)}
            />
            <p id="account-reason-help" className="text-xs text-muted-foreground">
              {t('couriers.account.reasonHelp', { max: REASON_MAX })}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant={mode === 'reactivate' ? 'default' : 'destructive'} disabled={!canSubmit || busy}>
              {busy ? <Spinner className="mr-2" /> : null}
              {mode === 'reactivate' ? t('couriers.account.reactivate') : t('couriers.account.deactivate')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// AC-4: every detail an admin may edit. A changed login email signs the rider out; the dialog says so.
function EditDetailsDialog({
  courier,
  email,
  emergencyContactName,
  emergencyContactPhone,
  onClose,
  returnFocusTo,
}: {
  courier: CourierAdminDto
  email: string
  emergencyContactName: string
  emergencyContactPhone: string
  onClose: () => void
  returnFocusTo: React.RefObject<HTMLElement>
}) {
  const { t } = useTranslation()
  const { errorText } = useServerText()
  const { toast } = useToast()
  const [save, { isLoading }] = useEditCourierDetailsMutation()
  const [form, setForm] = useState({
    firstName: courier.firstName,
    lastName: courier.lastName,
    phoneNumber: courier.phoneNumber ?? '',
    email,
    emergencyContactName,
    emergencyContactPhone,
  })
  // What the server threw, kept as it came: its words are worked out when drawn, in the current language.
  const [failure, setFailure] = useState<{ error: unknown } | null>(null)
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }))
  const emailChanged = form.email.trim().toLowerCase() !== email.trim().toLowerCase()
  const canSubmit = form.firstName.trim() !== '' && form.lastName.trim() !== '' && form.email.trim() !== ''

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit || isLoading) return
    setFailure(null)
    try {
      await save({
        id: courier.id,
        input: {
          firstName: form.firstName,
          lastName: form.lastName,
          phoneNumber: form.phoneNumber,
          email: form.email,
          emergencyContactName: form.emergencyContactName,
          emergencyContactPhone: form.emergencyContactPhone,
        },
      }).unwrap()
      toast({ title: t('couriers.account.editSaved') })
      onClose()
    } catch (err: unknown) {
      setFailure({ error: err })
    }
  }

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div className="space-y-1">
      <Label htmlFor={`edit-${key}`}>{label}</Label>
      <Input id={`edit-${key}`} type={type} value={form[key]} onChange={set(key)} />
    </div>
  )

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusTo.current?.focus()
        }}
      >
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{t('couriers.account.editDetails')}</DialogTitle>
            <DialogDescription>{t('couriers.account.editDescription')}</DialogDescription>
          </DialogHeader>
          {failure ? (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {errorText(failure.error, t('couriers.account.editFailed'))}
            </p>
          ) : null}
          <div className="space-y-3 py-4">
            {field('firstName', t('couriers.field.firstName'))}
            {field('lastName', t('couriers.field.lastName'))}
            {field('phoneNumber', t('couriers.field.phoneNumber'), 'tel')}
            {field('email', t('couriers.field.email'), 'email')}
            {emailChanged ? (
              <p role="note" className="rounded-md border border-border bg-muted p-3 text-xs">
                {t('couriers.account.emailNote')}
              </p>
            ) : null}
            {field('emergencyContactName', t('couriers.field.emergencyContactName'))}
            {field('emergencyContactPhone', t('couriers.field.emergencyContactPhone'), 'tel')}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit || isLoading}>
              {isLoading ? <Spinner className="mr-2" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
