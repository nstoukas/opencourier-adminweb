import React, { useEffect, useState } from 'react'
import {
  Button,
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
import { useTranslation } from 'react-i18next'
import { useRotateCourierPasswordMutation } from '@/api/couriersApi'
import { useServerText } from '@/i18n/useServerText'
import { PASSWORD_MAX, PASSWORD_MIN, isValidPasswordPair, passwordProblem } from './courierAccountRules'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  courierId: string
  // The rider's first name, or "this rider" when it is empty.
  firstName: string
  // True while the rider's Right now card is not empty (spec 0013, AC-6).
  carryingDelivery: boolean
  // The button that opened the dialog; focus goes back to it on close (adminweb AGENTS.md).
  returnFocusTo: React.RefObject<HTMLElement>
}

// Sets a new password for a rider (spec 0013, AC-4 to AC-6). The backend signs the old phone out
// and sets the rider Offline; this dialog says so first. It warns, it never blocks: a stolen phone
// must be stoppable.
export function RotateCourierPasswordDialog({
  open,
  onOpenChange,
  courierId,
  firstName,
  carryingDelivery,
  returnFocusTo,
}: Props) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const { errorText } = useServerText()
  const { toast } = useToast()
  const [rotatePassword, { isLoading }] = useRotateCourierPasswordMutation()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  // What the server threw, kept as it came: its words are worked out when drawn, in the current language.
  const [failure, setFailure] = useState<{ error: unknown } | null>(null)
  const name = firstName.trim()
  const Who = name || t('couriers.rotate.thisRider')

  useEffect(() => {
    if (open) {
      setPassword('')
      setConfirm('')
      setFailure(null)
    }
  }, [open])

  const problem = passwordProblem(password, confirm, t)
  const isValid = isValidPasswordPair(password, confirm)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValid || isLoading) return
    setFailure(null)
    try {
      await rotatePassword({ id: courierId, password }).unwrap()
      toast({ title: name ? t('couriers.rotate.toastNamed', { name }) : t('couriers.rotate.toastUnnamed') })
      onOpenChange(false)
    } catch (err: unknown) {
      setFailure({ error: err })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusTo.current?.focus()
        }}
      >
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{t('couriers.rotate.title')}</DialogTitle>
            <DialogDescription>{t('couriers.rotate.description', { who: Who })}</DialogDescription>
          </DialogHeader>

          {carryingDelivery ? (
            <p role="note" className="mt-3 rounded-md border border-border bg-muted p-3 text-sm">
              {t('couriers.rotate.carrying', { who: Who })}
            </p>
          ) : null}

          {failure ? (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {errorText(failure.error, t('couriers.rotate.saveFailed'))}
            </p>
          ) : null}

          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label htmlFor="rider-new-password">{t('couriers.rotate.newPassword')}</Label>
              <Input
                id="rider-new-password"
                type="password"
                autoComplete="new-password"
                placeholder={t('couriers.password.placeholder', { min: PASSWORD_MIN, max: PASSWORD_MAX })}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rider-new-password-confirm">{t('couriers.rotate.newPasswordAgain')}</Label>
              <Input
                id="rider-new-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                aria-describedby={problem ? 'rider-new-password-problem' : undefined}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {problem ? (
                <p id="rider-new-password-problem" className="text-xs text-destructive">
                  {problem}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading ? <Spinner className="mr-2" /> : null}
              {t('couriers.rotate.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
