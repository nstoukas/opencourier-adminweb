import React, { useEffect, useRef, useState } from 'react'
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
import { formatDate } from '@/ui-shared-utils'
import { backendMessage } from './courierAccountRules'

// Spec 0051 (row 108, AC-6): a rider's account. The login email and the emergency contact, Deactivate or
// Reactivate, an edit of every detail, and the record of every account action, newest first. A person
// decides each of these; the record is what the rider sees too (as "the co-op").

export const REASON_MAX = 300

const FIELD_WORDS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  phoneNumber: 'Phone',
  email: 'Login email',
  emergencyContactName: 'Emergency contact name',
  emergencyContactPhone: 'Emergency contact phone',
  deliverySetting: 'Offers',
}

// One history line in words.
export function accountChangeText(change: CourierAccountChangeAdminDto): string {
  switch (change.kind) {
    case 'DEACTIVATED':
      return `Deactivated${change.reason ? `: ${change.reason}` : ''}`
    case 'REACTIVATED':
      return `Reactivated${change.reason ? `: ${change.reason}` : ''}`
    case 'PASSWORD_CHANGED':
      return 'Password changed'
    // Spec 0050 (cross check 14): an admin downloaded the rider's statement ("2026-10 PDF").
    case 'STATEMENT_DOWNLOADED':
      return `Statement downloaded: ${change.newValue ?? ''}`
    case 'FIELD_EDITED': {
      const field = (change.field && FIELD_WORDS[change.field]) || change.field || 'A detail'
      return `${field}: ${change.oldValue ?? 'empty'} → ${change.newValue ?? 'empty'}`
    }
    default:
      return change.kind
  }
}

function actorText(change: CourierAccountChangeAdminDto): string {
  if (change.actorIsRider) return 'by the rider'
  return change.actorEmail ? `by ${change.actorEmail}` : 'by an admin'
}

type Props = { courier: CourierAdminDto; name: string }

export function CourierAccountCard({ courier, name }: Props) {
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
        <CardTitle className="text-lg">Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {accountQuery.isError ? (
          <p className="text-destructive">Could not load the account.</p>
        ) : (
          <DetailList
            items={[
              {
                label: 'Account',
                value: deactivated
                  ? `Deactivated${account?.deactivatedAt ? ` on ${formatDate(account.deactivatedAt)}` : ''}`
                  : 'Active',
              },
              { label: 'Login email', value: account?.email ?? '—' },
              {
                label: 'Emergency contact',
                value:
                  account && (account.emergencyContactName || account.emergencyContactPhone)
                    ? [account.emergencyContactName, account.emergencyContactPhone].filter(Boolean).join(', ')
                    : 'None given',
              },
            ]}
          />
        )}
        <div className="flex flex-wrap gap-2">
          <Button ref={editRef} type="button" variant="outline" disabled={!account} onClick={() => setDialog('edit')}>
            Edit details
          </Button>
          <Button
            ref={actionRef}
            type="button"
            variant={deactivated ? 'outline' : 'destructive'}
            onClick={() => setDialog(deactivated ? 'reactivate' : 'deactivate')}
          >
            {deactivated ? 'Reactivate' : 'Deactivate'}
          </Button>
        </div>

        <div>
          <h3 className="mb-2 font-medium">Account history</h3>
          {changesQuery.isError ? (
            <p className="text-destructive">Could not load the account history.</p>
          ) : changes.length === 0 ? (
            <p className="text-muted-foreground">No changes yet.</p>
          ) : (
            <ul className="space-y-1">
              {changes.map((change) => (
                <li key={change.id}>
                  <span className="text-muted-foreground">{formatDate(change.createdAt)}</span> ·{' '}
                  {accountChangeText(change)} <span className="text-muted-foreground">{actorText(change)}</span>
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
  const { toast } = useToast()
  const [deactivate, deactivateState] = useDeactivateCourierMutation()
  const [reactivate, reactivateState] = useReactivateCourierMutation()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (mode) {
      setReason('')
      setError(null)
    }
  }, [mode])
  const busy = deactivateState.isLoading || reactivateState.isLoading
  const trimmed = reason.trim()
  const canSubmit = mode === 'reactivate' || (trimmed.length > 0 && trimmed.length <= REASON_MAX)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!mode || !canSubmit || busy) return
    setError(null)
    try {
      if (mode === 'deactivate') {
        await deactivate({ id: courierId, reason: trimmed }).unwrap()
        toast({ title: `${name}'s account is deactivated.` })
      } else {
        await reactivate({ id: courierId, reason: trimmed || undefined }).unwrap()
        toast({ title: `${name}'s account is active again.` })
      }
      onClose()
    } catch (err: unknown) {
      setError(backendMessage(err, 'This could not be saved. Please try again.'))
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
            <DialogTitle>{mode === 'reactivate' ? `Reactivate ${name}` : `Deactivate ${name}`}</DialogTitle>
            <DialogDescription>
              {mode === 'reactivate'
                ? 'They keep their login and history and start Offline. Their password is cleared: they set a new one with Forgot password, or you set one with Change password.'
                : 'They are signed out on every phone and set Offline, and can no longer sign in or get offers. Their shift bookings that have not ended are dropped. Their deliveries, pay and records stay. A rider who holds a job or has an open SOS cannot be deactivated.'}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <div className="space-y-1 py-4">
            <Label htmlFor="account-reason">{mode === 'reactivate' ? 'Reason (optional)' : 'Reason'}</Label>
            <Input
              id="account-reason"
              value={reason}
              maxLength={REASON_MAX}
              aria-describedby="account-reason-help"
              onChange={(e) => setReason(e.target.value)}
            />
            <p id="account-reason-help" className="text-xs text-muted-foreground">
              Up to {REASON_MAX} characters. The rider sees it in their account history.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant={mode === 'reactivate' ? 'default' : 'destructive'} disabled={!canSubmit || busy}>
              {busy ? <Spinner className="mr-2" /> : null}
              {mode === 'reactivate' ? 'Reactivate' : 'Deactivate'}
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
  const [error, setError] = useState<string | null>(null)
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }))
  const emailChanged = form.email.trim().toLowerCase() !== email.trim().toLowerCase()
  const canSubmit = form.firstName.trim() !== '' && form.lastName.trim() !== '' && form.email.trim() !== ''

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit || isLoading) return
    setError(null)
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
      toast({ title: 'Details saved.' })
      onClose()
    } catch (err: unknown) {
      setError(backendMessage(err, 'The details could not be saved. Please try again.'))
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
            <DialogTitle>Edit details</DialogTitle>
            <DialogDescription>Every change is recorded, and the rider sees it in their account history.</DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <div className="space-y-3 py-4">
            {field('firstName', 'First name')}
            {field('lastName', 'Last name')}
            {field('phoneNumber', 'Phone', 'tel')}
            {field('email', 'Login email', 'email')}
            {emailChanged ? (
              <p role="note" className="rounded-md border border-border bg-muted p-3 text-xs">
                A new login email signs the rider out on every phone. Their old address is told about the change.
              </p>
            ) : null}
            {field('emergencyContactName', 'Emergency contact name')}
            {field('emergencyContactPhone', 'Emergency contact phone', 'tel')}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isLoading}>
              {isLoading ? <Spinner className="mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
