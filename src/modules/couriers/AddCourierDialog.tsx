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
import { useCreateCourierMutation } from '@/api/couriersApi'
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  backendMessage,
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
  const [createCourier, { isLoading }] = useCreateCourierMutation()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
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
      setError(null)
      setCreated(null)
    }
  }, [open])

  const phoneProblem =
    phone.length > 0 && !isValidRiderPhone(phone) ? 'A plus and 8 to 15 digits, e.g. +30 690 000 0000.' : null
  const emailProblem = email.length > 0 && !isValidEmail(email) ? 'Not a valid email address.' : null
  const pwProblem = passwordProblem(password, confirm)
  const isValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    isValidRiderPhone(phone) &&
    isValidEmail(email) &&
    isValidPasswordPair(password, confirm)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValid || isLoading) return
    setError(null)
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
      // The backend names which value is taken ("That phone is already used by another rider.").
      setError(backendMessage(err, 'The rider could not be created. Please try again.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          // Radix would leave focus on the page body; put it back on the Add courier button.
          event.preventDefault()
          returnFocusTo.current?.focus()
        }}
      >
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>{created.name} can log in</DialogTitle>
              <DialogDescription>Copy them now: the password cannot be shown again.</DialogDescription>
            </DialogHeader>
            <dl className="space-y-2 rounded-md border border-border p-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all font-mono">{created.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Password</dt>
                <dd className="break-all font-mono">{created.password}</dd>
              </div>
            </dl>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Done
              </Button>
              <Button type="button" onClick={() => onOpenCourier(created.courierId)}>
                Open {created.name}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <DialogHeader>
              <DialogTitle>Add courier</DialogTitle>
              <DialogDescription>
                Creates the rider and their login. You will see the password once, to pass on to them.
              </DialogDescription>
            </DialogHeader>

            {error ? (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {error}
              </p>
            ) : null}

            <div className="space-y-3 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="courier-first-name">First name</Label>
                  <Input
                    id="courier-first-name"
                    value={firstName}
                    maxLength={255}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="courier-last-name">Last name</Label>
                  <Input
                    id="courier-last-name"
                    value={lastName}
                    maxLength={255}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="courier-phone">Phone</Label>
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
                <Label htmlFor="courier-email">Email (their login)</Label>
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
                <Label htmlFor="courier-password">Password</Label>
                <Input
                  id="courier-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={`${PASSWORD_MIN} to ${PASSWORD_MAX} characters`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="courier-password-confirm">Password again</Label>
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
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isValid || isLoading}>
                {isLoading ? <Spinner className="mr-2" /> : null}
                Create courier
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
