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
import { usePageVisible } from '@/hooks/usePageVisible'
import { useTranslation } from 'react-i18next'
// TFunction is the type of t, so a plain helper can take it as a parameter.
import type { TFunction } from 'i18next'
import { useServerText } from '@/i18n/useServerText'
import { useFormat, type Formats } from '@/i18n/useFormat'

const REASON_MAX = 200
// The history is read again as the card's own state is, while the tab is visible.
const REFRESH_MS = 30_000

// One history line in the reader's language. It takes t and the formats because its sentences carry values.
function changeWords(change: PartnerAvailabilityChangeAdminDto, t: TFunction, f: Formats): string {
  switch (change.action) {
    case 'BUSY_ON':
      return t('partners.availability.change.busyOn', { minutes: change.extraMinutes })
    case 'BUSY_OFF':
      return t('partners.availability.change.busyOff')
    case 'PAUSED':
      // f.dateTime reads "—" for a missing date, as this line always did.
      return t('partners.availability.change.pausedUntil', { date: f.dateTime(change.pausedUntil) })
    case 'RESUMED':
      return t('partners.availability.change.resumed')
    case 'DISABLED':
      // The reason is the representative's own words, shown as written.
      return t('partners.availability.change.disabled', { reason: change.reason ?? '' })
    case 'ENABLED':
      return t('partners.availability.change.enabled')
  }
}

// Spec 0029 (AC-9): what this restaurant can do now, a representative's Disable and Enable, and who
// changed what. A disable keeps the restaurant signed in; it only stops new orders.
export function PartnerAvailabilityCard({ partner }: { partner: PartnerAdminDto }) {
  const { toast } = useToast()
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // errorText: the server's refusal in the reader's language, or our own sentence when it gave none.
  const { errorText } = useServerText()
  // Dates in the reader's language, on Athens time.
  const f = useFormat()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reason, setReason] = useState('')
  // Words, not a key: the error shows only inside the modal dialog, where the language switch cannot be reached.
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
      setError(t('partners.availability.reasonRequired', { max: REASON_MAX }))
      return
    }
    setError('')
    try {
      await disablePartner({ id: partner.id, reason: trimmed }).unwrap()
      toast({ title: t('partners.availability.disabledToast', { name: partner.name }) })
      setDialogOpen(false)
    } catch (err: any) {
      setError(errorText(err, t('partners.availability.disableFailed')))
    }
  }

  const handleEnable = async () => {
    try {
      await enablePartner({ id: partner.id }).unwrap()
      toast({ title: t('partners.availability.enabledToast', { name: partner.name }) })
    } catch (err: any) {
      toast({ title: errorText(err, t('partners.availability.enableFailed')), variant: 'destructive' })
    }
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('partners.availability.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p data-testid="availability-state">
          {/* The server's own sentence for why it is not taking orders, shown as it came. */}
          {availability?.acceptingOrders === false ? availability.notAcceptingReason : t('partners.availability.accepting')}
        </p>
        {availability?.busyExtraMinutes ? (
          <p>{t('partners.availability.busyMode', { minutes: availability.busyExtraMinutes })}</p>
        ) : null}
        {disabled ? (
          <Button type="button" variant="outline" disabled={enableState.isLoading} onClick={handleEnable}>
            {t('partners.availability.enable')}
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
            {t('partners.availability.disable')}
          </Button>
        )}

        <div>
          <p className="font-medium">{t('partners.availability.history')}</p>
          {changesQuery.isError ? (
            <p className="text-destructive">{t('partners.availability.historyFailed')}</p>
          ) : (changesQuery.data ?? []).length === 0 ? (
            <p className="text-muted-foreground">{t('partners.availability.noChanges')}</p>
          ) : (
            <ul className="space-y-1">
              {(changesQuery.data ?? []).map((change) => (
                <li key={change.id}>
                  <span className="text-muted-foreground">{f.dateTime(change.createdAt)}</span>{' '}
                  {changeWords(change, t, f)}
                  <span className="text-muted-foreground">
                    {' '}
                    {'('}
                    {/* The role code as words; a role this copy does not know is shown as its code. */}
                    {t(`partners.availability.actorRole.${change.actorRole}`, { defaultValue: change.actorRole })}
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
            <DialogTitle>{t('partners.availability.dialogTitle', { name: partner.name })}</DialogTitle>
            <DialogDescription>{t('partners.availability.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disable-reason">{t('partners.availability.reason')}</Label>
            <Textarea id="disable-reason" value={reason} maxLength={REASON_MAX} onChange={(event) => setReason(event.target.value)} />
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" disabled={disableState.isLoading} onClick={handleDisable}>
              {t('partners.availability.disable')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
