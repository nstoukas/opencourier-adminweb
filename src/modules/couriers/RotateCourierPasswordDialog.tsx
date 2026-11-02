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
import { useRotateCourierPasswordMutation } from '@/api/couriersApi'
import { PASSWORD_MAX, PASSWORD_MIN, backendMessage, isValidPasswordPair, passwordProblem } from './courierAccountRules'

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
  const { toast } = useToast()
  const [rotatePassword, { isLoading }] = useRotateCourierPasswordMutation()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const who = firstName.trim() || 'this rider'
  const Who = firstName.trim() || 'This rider'

  useEffect(() => {
    if (open) {
      setPassword('')
      setConfirm('')
      setError(null)
    }
  }, [open])

  const problem = passwordProblem(password, confirm)
  const isValid = isValidPasswordPair(password, confirm)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValid || isLoading) return
    setError(null)
    try {
      await rotatePassword({ id: courierId, password }).unwrap()
      toast({ title: `New password set for ${who}. Their phone is signed out.` })
      onOpenChange(false)
    } catch (err: unknown) {
      setError(backendMessage(err, 'The password could not be changed. Please try again.'))
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
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              {Who} is signed out of the app on their phone and set Offline. They log in again with the new password.
            </DialogDescription>
          </DialogHeader>

          {carryingDelivery ? (
            <p role="note" className="mt-3 rounded-md border border-border bg-muted p-3 text-sm">
              {Who} is carrying a delivery. Steps still waiting on their phone are sent only when they log in again on
              that phone. If the phone is lost, reassign the delivery.
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label htmlFor="rider-new-password">New password</Label>
              <Input
                id="rider-new-password"
                type="password"
                autoComplete="new-password"
                placeholder={`${PASSWORD_MIN} to ${PASSWORD_MAX} characters`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rider-new-password-confirm">New password again</Label>
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
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading ? <Spinner className="mr-2" /> : null}
              Set new password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
