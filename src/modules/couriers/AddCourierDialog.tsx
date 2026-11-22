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
} from '@/admin-web-components'
import { useTranslation } from 'react-i18next'
import { useCreateCourierMutation } from '@/api/couriersApi'
import { useServerText } from '@/i18n/useServerText'
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  isValidEmail,
  isValidPasswordPair,
  isValidRiderPhone,
  passwordProblem,
  phoneWithoutSpaces,
} from './courierAccountRules'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // The button that opened the dialog; focus goes back to it on close (adminweb AGENTS.md).
  returnFocusTo: React.RefObject<HTMLElement>
  onOpenCourier: (courierId: string) => void
}

// What the admin sees once, after the rider is created (spec 0013, AC-2).
type CreatedNotice = { courierId: string; name: string; email: string; password: string }

// The co-op issues every rider's login (spec 0013, AC-1 to AC-3): an admin types the rider's
// details and a password, and sees the login once to pass on. There is no public sign up.
export function AddCourierDialog({ open, onOpenChange, returnFocusTo, onOpenCourier }: Props) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const { errorText } = useServerText()
  const [createCourier, { isLoading }] = useCreateCourierMutation()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  // What the server threw, kept as it came: its words are worked out when drawn, in the current language.
  const [failure, setFailure] = useState<{ error: unknown } | null>(null)
  const [created, setCreated] = useState<CreatedNotice | null>(null)

  // Every time the dialog opens it starts empty, and the last notice is gone for good.
  useEffect(() => {
    if (open) {
      setFirstName('')
      setLastName('')
      setPhone('')
      setEmail('')
      setPassword('')
      setConfirm('')
      setFailure(null)
      setCreated(null)
    }
  }, [open])

  const phoneProblem =
    phone.length > 0 && !isValidRiderPhone(phone) ? t('couriers.add.phoneProblem') : null
  const emailProblem = email.length > 0 && !isValidEmail(email) ? t('couriers.add.emailProblem') : null
  const pwProblem = passwordProblem(password, confirm, t)
  const isValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    isValidRiderPhone(phone) &&
    isValidEmail(email) &&
    isValidPasswordPair(password, confirm)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValid || isLoading) return
    setFailure(null)
    try {
      const courier = await createCourier({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneWithoutSpaces(phone),
        email: email.trim().toLowerCase(),
        password,
      }).unwrap()
      // The password comes from the form, never from the response: the backend never sends it back.
      setCreated({
        courierId: courier.id,
        name: `${courier.firstName} ${courier.lastName}`.trim(),
        email: email.trim().toLowerCase(),
        password,
      })
    } catch (err: unknown) {
      setFailure({ error: err })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Never close while the rider is being created: the password would be lost with a rider
        // nobody can log in as (row 16 review).
        if (!next && isLoading) return
        onOpenChange(next)
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        // Escape or a click outside does not close the notice by accident: it is the only time
        // the password is shown. Done, Open and the close button still close it.
        onEscapeKeyDown={(event) => {
          if (created || isLoading) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (created || isLoading) event.preventDefault()
        }}
        onCloseAutoFocus={(event) => {
          // Radix would leave focus on the page body; put it back on the Add courier button.
          event.preventDefault()
          returnFocusTo.current?.focus()
        }}
      >
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('couriers.add.createdTitle', { name: created.name })}</DialogTitle>
              <DialogDescription>{t('couriers.add.createdDescription')}</DialogDescription>
            </DialogHeader>
            <dl className="space-y-2 rounded-md border border-border p-3 text-sm">
              <div>
                <dt className="text-muted-foreground">{t('couriers.add.email')}</dt>
                <dd className="break-all font-mono">{created.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('couriers.add.password')}</dt>
                <dd className="break-all font-mono">{created.password}</dd>
              </div>
            </dl>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('couriers.add.done')}
              </Button>
              <Button type="button" onClick={() => onOpenCourier(created.courierId)}>
                {t('couriers.add.open', { name: created.name })}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <DialogHeader>
              <DialogTitle>{t('couriers.add.title')}</DialogTitle>
              <DialogDescription>{t('couriers.add.description')}</DialogDescription>
            </DialogHeader>

            {failure ? (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {/* The backend names which value is taken ("That phone is already used by another rider."). */}
                {errorText(failure.error, t('couriers.add.saveFailed'))}
              </p>
            ) : null}

            <div className="space-y-3 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="courier-first-name">{t('couriers.field.firstName')}</Label>
                  <Input
                    id="courier-first-name"
                    value={firstName}
                    maxLength={255}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="courier-last-name">{t('couriers.field.lastName')}</Label>
                  <Input
                    id="courier-last-name"
                    value={lastName}
                    maxLength={255}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="courier-phone">{t('couriers.field.phoneNumber')}</Label>
                <Input
                  id="courier-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+30 690 000 0000"
                  value={phone}
                  aria-invalid={phoneProblem ? true : undefined}
                  aria-describedby={phoneProblem ? 'courier-phone-problem' : undefined}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {phoneProblem ? (
                  <p id="courier-phone-problem" className="text-xs text-destructive">
                    {phoneProblem}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor="courier-email">{t('couriers.add.emailLogin')}</Label>
                <Input
                  id="courier-email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  maxLength={255}
                  aria-invalid={emailProblem ? true : undefined}
                  aria-describedby={emailProblem ? 'courier-email-problem' : undefined}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {emailProblem ? (
                  <p id="courier-email-problem" className="text-xs text-destructive">
                    {emailProblem}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor="courier-password">{t('couriers.add.password')}</Label>
                <Input
                  id="courier-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('couriers.password.placeholder', { min: PASSWORD_MIN, max: PASSWORD_MAX })}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="courier-password-confirm">{t('couriers.add.passwordAgain')}</Label>
                <Input
                  id="courier-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  aria-describedby={pwProblem ? 'courier-password-problem' : undefined}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                {pwProblem ? (
                  <p id="courier-password-problem" className="text-xs text-destructive">
                    {pwProblem}
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" disabled={isLoading} onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!isValid || isLoading}>
                {isLoading ? <Spinner className="mr-2" /> : null}
                {t('couriers.add.submit')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
