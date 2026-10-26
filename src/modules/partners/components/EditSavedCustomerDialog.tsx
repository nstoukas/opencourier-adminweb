import React, { useState } from 'react'
import {
  Alert,
  AlertDescription,
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
  Textarea,
} from '@/admin-web-components'
import type { SavedCustomerAdminDto } from '@/backend-admin-sdk'
import { useUpdatePartnerCustomerMutation } from '@/api/savedCustomersApi'

interface EditSavedCustomerDialogProps {
  partnerId: string
  restaurantName: string
  customer: SavedCustomerAdminDto
  onClose: () => void
  onSaved: (customer: SavedCustomerAdminDto) => void
  // The edit answered 404: the restaurant (or another admin) deleted the customer meanwhile.
  onGone: (id: string) => void
  // Radix calls it as the dialog lets go of focus; the card uses it to put focus on the table.
  onCloseAutoFocus?: (event: Event) => void
}

// Trimmed text, or null when nothing is left.
const optional = (value: string) => (value.trim() === '' ? null : value.trim())

/**
 * An admin corrects a restaurant's saved customer (spec 0005, AC-6): name, phone, floor or flat and
 * notes. The address and its map point stay as the restaurant saved them. The backend logs the edit
 * with the admin's account and the ids only.
 */
export const EditSavedCustomerDialog: React.FC<EditSavedCustomerDialogProps> = ({
  partnerId,
  restaurantName,
  customer,
  onClose,
  onSaved,
  onGone,
  onCloseAutoFocus,
}) => {
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone)
  const [floor, setFloor] = useState(customer.addressLine2 ?? '')
  const [notes, setNotes] = useState(customer.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [updateCustomer, { isLoading }] = useUpdatePartnerCustomerMutation()

  const save = async (event: React.FormEvent) => {
    // A <form> submit would reload the page; this keeps it a single page app.
    event.preventDefault()
    setError(null)
    if (name.trim() === '' || phone.trim() === '') {
      setError('Name and phone cannot be empty.')
      return
    }
    try {
      // `.unwrap()` turns RTK's { data } or { error } result into a value or a thrown error.
      const saved = await updateCustomer({
        partnerId,
        id: customer.id,
        input: { name: name.trim(), phone: phone.trim(), addressLine2: optional(floor), notes: optional(notes) },
      }).unwrap()
      onSaved(saved)
    } catch (err) {
      const statusCode = (err as { statusCode?: number } | undefined)?.statusCode
      if (statusCode === 404) {
        onGone(customer.id)
        return
      }
      if (statusCode === 409) {
        setError('Another saved customer of this restaurant has this phone.')
        return
      }
      const message = (err as { message?: string } | undefined)?.message
      setError(statusCode === 422 && message ? message : 'The customer could not be saved. Try again in a moment.')
    }
  }

  return (
    // onOpenChange(false) is Radix closing the dialog (Escape, the X, a click outside).
    <Dialog open onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>Edit {customer.name}</DialogTitle>
          <DialogDescription>A saved customer of {restaurantName}.</DialogDescription>
        </DialogHeader>
        {/* Each maxLength is the backend's own limit, so the form never sends a value it refuses. */}
        <form onSubmit={save} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="saved-customer-name">Name</Label>
            <Input
              id="saved-customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="saved-customer-phone">Phone</Label>
            <Input
              id="saved-customer-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="saved-customer-floor">
              Floor or flat <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="saved-customer-floor" value={floor} onChange={(e) => setFloor(e.target.value)} maxLength={255} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="saved-customer-notes">
              Notes for the rider <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="saved-customer-notes"
              rows={2}
              className="resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={255}
            />
          </div>
          <div className="space-y-1 rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">Address</p>
            <p className="text-muted-foreground">{customer.formattedAddress || customer.addressLine1}</p>
            <p className="text-xs text-muted-foreground">The address and its map point stay as the restaurant saved them.</p>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {isLoading ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
