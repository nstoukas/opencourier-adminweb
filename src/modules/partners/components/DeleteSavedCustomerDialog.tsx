import React, { useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Spinner,
} from '@/admin-web-components'
import type { SavedCustomerAdminDto } from '@/backend-admin-sdk'
import { useDeletePartnerCustomerMutation } from '@/api/savedCustomersApi'
import { useTranslation } from 'react-i18next'

interface DeleteSavedCustomerDialogProps {
  partnerId: string
  customer: SavedCustomerAdminDto
  onClose: () => void
  // Called once the customer is gone: deleted now, or already deleted elsewhere (404).
  onDeleted: (id: string) => void
  // Radix calls it as the dialog lets go of focus; the card uses it to put focus on the table.
  onCloseAutoFocus?: (event: Event) => void
}

/** Asks first, naming the customer, then deletes for good (spec 0005, AC-6): how a customer's
 *  request to be removed is honoured. */
export const DeleteSavedCustomerDialog: React.FC<DeleteSavedCustomerDialogProps> = ({
  partnerId,
  customer,
  onClose,
  onDeleted,
  onCloseAutoFocus,
}) => {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const [deleteCustomer, { isLoading }] = useDeletePartnerCustomerMutation()
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setError(null)
    try {
      await deleteCustomer({ partnerId, id: customer.id }).unwrap()
      onDeleted(customer.id)
    } catch (err) {
      if ((err as { statusCode?: number } | undefined)?.statusCode === 404) {
        onDeleted(customer.id)
        return
      }
      setError(t('partners.deleteCustomer.failed'))
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isLoading && onClose()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('partners.deleteCustomer.title', { name: customer.name })}</AlertDialogTitle>
          <AlertDialogDescription>{t('partners.deleteCustomer.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
          {/* A plain Button, not AlertDialogAction, so the dialog stays open until the delete is done. */}
          <Button variant="destructive" onClick={confirm} disabled={isLoading}>
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {t('common.delete')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
