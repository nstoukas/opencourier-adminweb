import React, { useState, useEffect } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
  Input,
  Label,
  useToast,
} from '@/admin-web-components'
import { useRotatePartnerPasswordMutation } from '@/api/partnersApi'
import { ApiKeyShownOnce } from './ApiKeyShownOnce'

interface RotateCredentialsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerId: string
  partnerName: string
  // The button that opened the dialog: Radix does not give it focus back here, so we do.
  returnFocusTo?: React.RefObject<HTMLElement>
}

// Modal dialog for rotating a restaurant's login password.
export const RotateCredentialsDialog: React.FC<RotateCredentialsDialogProps> = ({
  open,
  onOpenChange,
  partnerId,
  partnerName,
  returnFocusTo,
}) => {
  const { toast } = useToast()
  const [rotatePassword, { isLoading }] = useRotatePartnerPasswordMutation()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Spec 0037, AC-1: the restaurant's new API key when the password change replaced one. Shown once,
  // in this dialog, and forgotten when it closes.
  const [newApiKey, setNewApiKey] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPassword('')
      setConfirmPassword('')
      setError(null)
    }
  }, [open])

  const isValid = password.length >= 8 && password === confirmPassword

  const handleRotate = async () => {
    if (!isValid) return
    setError(null)
    try {
      // The request object, kept so its answer is dropped from the Redux store right after it is read:
      // a key lives only in this dialog's state (AC-13). The hook's own `reset` cannot do it here, as
      // it still holds the render from before this request (Fable review, major).
      const request = rotatePassword({ id: partnerId, password })
      let answer
      try {
        answer = await request.unwrap()
      } finally {
        request.reset()
      }
      if (answer.apiKey) {
        // The restaurant had an API key: it was replaced with the password, so the old one stopped
        // working too. Show the new one instead of closing (spec 0037, AC-13).
        setNewApiKey(answer.apiKey)
        return
      }
      toast({ title: `Password updated for ${partnerName}.` })
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to rotate password. Please try again.')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // While the new API key is shown, nothing but Done closes the dialog (spec 0037, AC-13).
        if (!next && newApiKey) return
        onOpenChange(next)
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        hideCloseButton={Boolean(newApiKey)}
        // While the new API key is shown, only Done closes the dialog (spec 0037, AC-13).
        onEscapeKeyDown={(event) => {
          if (newApiKey) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (newApiKey) event.preventDefault()
        }}
        onCloseAutoFocus={(event) => {
          // Forget the key once the dialog has closed. Until then the title stays the same while
          // Radix animates the dialog closed (adminweb AGENTS.md).
          setNewApiKey(null)
          if (returnFocusTo?.current) {
            event.preventDefault()
            returnFocusTo.current.focus()
          }
        }}
      >
        {newApiKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Password set for {partnerName}</DialogTitle>
              <DialogDescription>
                The new password works now. This restaurant also had an API key: it was replaced too, so the old key
                stopped working. Here is the new one.
              </DialogDescription>
            </DialogHeader>
            <ApiKeyShownOnce apiKey={newApiKey} onDone={() => onOpenChange(false)} />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Set New Password for {partnerName}</DialogTitle>
              <DialogDescription>
                Sets a new password for this restaurant's login. The current password stops working immediately. It cannot be read back — note it down before you close this.
              </DialogDescription>
            </DialogHeader>

            {error ? (
          <div role="alert" className="text-sm text-destructive font-medium">
            {error}
          </div>
        ) : null}

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />
              </div>

              {password.length > 0 && password.length < 8 ? (
                <p className="text-xs text-amber-600">Password must be at least 8 characters.</p>
              ) : null}

              {confirmPassword.length > 0 && password !== confirmPassword ? (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={!isValid || isLoading} onClick={handleRotate}>
                {isLoading ? <Spinner className="mr-2" /> : null}
                Set New Password
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
