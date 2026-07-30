import React, { useState, useEffect } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icons,
  Input,
  Label,
  useToast,
} from '@/admin-web-components'
import { useRotatePartnerPasswordMutation } from '@/api/partnersApi'

interface RotateCredentialsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerId: string
  partnerName: string
}

// Modal dialog for rotating a restaurant's login password.
export const RotateCredentialsDialog: React.FC<RotateCredentialsDialogProps> = ({
  open,
  onOpenChange,
  partnerId,
  partnerName,
}) => {
  const { toast } = useToast()
  const [rotatePassword, { isLoading }] = useRotatePartnerPasswordMutation()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

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
      await rotatePassword({ id: partnerId, password }).unwrap()
      toast({ title: `Password updated for ${partnerName}.` })
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to rotate password. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rotate Password for {partnerName}</DialogTitle>
          <DialogDescription>
            Sets a new password for this restaurant's login. The current password stops working immediately. It cannot be read back — note it down before you close this.
          </DialogDescription>
        </DialogHeader>

        {error ? <div className="text-sm text-destructive font-medium">{error}</div> : null}

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
            {isLoading ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
            Rotate Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
