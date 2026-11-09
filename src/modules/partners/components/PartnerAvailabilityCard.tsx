import React, { useRef, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
  useToast,
} from '@/admin-web-components'
import {
  useDisablePartnerMutation,
  useEnablePartnerMutation,
  useGetPartnerAvailabilityChangesQuery,
} from '@/api/partnersApi'
import type { PartnerAdminDto, PartnerAvailabilityChangeAdminDto } from '@/backend-admin-sdk'
import { formatDate } from '@/ui-shared-utils'
import { usePageVisible } from '@/hooks/usePageVisible'

const REASON_MAX = 200
// The history is read again as the card's own state is, while the tab is visible.
const REFRESH_MS = 30_000

function changeWords(change: PartnerAvailabilityChangeAdminDto): string {
  switch (change.action) {
    case 'BUSY_ON':
      return `Busy mode on, +${change.extraMinutes} min`
    case 'BUSY_OFF':
      return 'Busy mode off'
    case 'PAUSED':
      return `Paused until ${change.pausedUntil ? formatDate(change.pausedUntil) : '—'}`
    case 'RESUMED':
      return 'Resumed'
    case 'DISABLED':
      return `Disabled: ${change.reason ?? ''}`
    case 'ENABLED':
      return 'Enabled'
  }
}

// Spec 0029 (AC-9): what this restaurant can do now, a representative's Disable and Enable, and who
// changed what. A disable keeps the restaurant signed in; it only stops new orders.
export function PartnerAvailabilityCard({ partner }: { partner: PartnerAdminDto }) {
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const disableButtonRef = useRef<HTMLButtonElement>(null)
  const [disablePartner, disableState] = useDisablePartnerMutation()
  const [enablePartner, enableState] = useEnablePartnerMutation()
  // 0 while the tab is in the background: RTK Query does not poll at 0.
  const pageVisible = usePageVisible()
  const changesQuery = useGetPartnerAvailabilityChangesQuery(
    { id: partner.id },
    { pollingInterval: pageVisible ? REFRESH_MS : 0 },
  )

  const availability = partner.availability
  const disabled = !!availability?.disabledAt
  const trimmed = reason.trim()

  const handleDisable = async () => {
    if (trimmed.length === 0 || trimmed.length > REASON_MAX) {
      setError(`Give a reason, up to ${REASON_MAX} characters.`)
      return
    }
    setError('')
    try {
      await disablePartner({ id: partner.id, reason: trimmed }).unwrap()
      toast({ title: `${partner.name} is disabled.` })
      setDialogOpen(false)
    } catch (err: any) {
      setError(err?.message || 'Could not disable this restaurant.')
    }
  }

  const handleEnable = async () => {
    try {
      await enablePartner({ id: partner.id }).unwrap()
      toast({ title: `${partner.name} is enabled.` })
    } catch (err: any) {
      toast({ title: err?.message || 'Could not enable this restaurant.', variant: 'destructive' })
    }
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Availability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p data-testid="availability-state">
          {availability?.acceptingOrders === false ? availability.notAcceptingReason : 'Accepting orders.'}
        </p>
        {availability?.busyExtraMinutes ? <p>Busy mode: +{availability.busyExtraMinutes} min on new orders.</p> : null}
        {disabled ? (
          <Button type="button" variant="outline" disabled={enableState.isLoading} onClick={handleEnable}>
            Enable
          </Button>
        ) : (
          <Button
            ref={disableButtonRef}
            type="button"
            variant="outline"
            onClick={() => {
              setReason('')
              setError('')
              setDialogOpen(true)
            }}
          >
            Disable
          </Button>
        )}

        <div>
          <p className="font-medium">History</p>
          {changesQuery.isError ? (
            <p className="text-destructive">Could not load the history.</p>
          ) : (changesQuery.data ?? []).length === 0 ? (
            <p className="text-muted-foreground">No changes yet.</p>
          ) : (
            <ul className="space-y-1">
              {(changesQuery.data ?? []).map((change) => (
                <li key={change.id}>
                  <span className="text-muted-foreground">{formatDate(change.createdAt)}</span>{' '}
                  {changeWords(change)}
                  <span className="text-muted-foreground">
                    {' '}
                    ({change.actorRole}
                    {change.actorEmail ? ` · ${change.actorEmail}` : ''})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          onCloseAutoFocus={(event) => {
            if (disableButtonRef.current) {
              event.preventDefault()
              disableButtonRef.current.focus()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Disable {partner.name}</DialogTitle>
            <DialogDescription>It keeps its sign in but cannot place orders. The restaurant reads your reason.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disable-reason">Reason</Label>
            <Textarea id="disable-reason" value={reason} maxLength={REASON_MAX} onChange={(event) => setReason(event.target.value)} />
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={disableState.isLoading} onClick={handleDisable}>
              Disable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
