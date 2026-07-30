import React, { useState, useEffect } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Icons,
  Input,
  useToast,
} from '@/admin-web-components'
import type { PartnerAdminDto } from '@/backend-admin-sdk'
import { useCreatePartnerMutation, useUpdatePartnerMutation } from '@/api/partnersApi'
import { usePartnerCreateForm, usePartnerUpdateForm } from '../hooks/form/usePartnerForm'
import { PickupAddressFields } from './PickupAddressFields'
import { buildPartnerCreateInput, buildPartnerUpdateInput, PartnerCreateFormValues, PartnerUpdateFormValues } from '@/utils/partnerFormInput'
import { mapLocationToPickupFormValues } from '@/utils/partnerPickupAddress'

interface PartnerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'update'
  partner?: PartnerAdminDto
}

// Modal dialog for creating or updating a restaurant (Partner) profile and pickup address.
export const PartnerFormDialog: React.FC<PartnerFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  partner,
}) => {
  const { toast } = useToast()
  const [createPartner, { isLoading: isCreating }] = useCreatePartnerMutation()
  const [updatePartner, { isLoading: isUpdating }] = useUpdatePartnerMutation()
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [createdPasswordNotice, setCreatedPasswordNotice] = useState<string | null>(null)

  const createForm = usePartnerCreateForm()
  const updateForm = usePartnerUpdateForm()

  const isLoading = isCreating || isUpdating

  useEffect(() => {
    if (open) {
      setValidationErrors([])
      setCreatedPasswordNotice(null)
      if (mode === 'update' && partner) {
        updateForm.reset({
          name: partner.name ?? '',
          phoneNumber: partner.phoneNumber ?? '',
          logo: partner.logo ?? '',
          webhookUrl: partner.webhookUrl ?? '',
          pickupAddress: mapLocationToPickupFormValues(partner.pickupAddress),
        })
      } else {
        createForm.reset()
      }
    }
  }, [open, mode, partner])

  const handleCreateSubmit = async (values: PartnerCreateFormValues) => {
    setValidationErrors([])
    setCreatedPasswordNotice(null)

    const buildRes = buildPartnerCreateInput(values)
    if (!buildRes.ok) {
      setValidationErrors(buildRes.errors)
      return
    }

    try {
      await createPartner(buildRes.value).unwrap()
      toast({ title: 'Restaurant created successfully' })
      setCreatedPasswordNotice(`Password set for ${buildRes.value.email}: "${buildRes.value.password}". Copy it now — it cannot be shown again.`)
    } catch (err: any) {
      toast({
        title: 'Failed to create restaurant',
        description: err?.message || 'An error occurred while creating the restaurant.',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateSubmit = async (values: PartnerUpdateFormValues) => {
    setValidationErrors([])
    setCreatedPasswordNotice(null)

    if (!partner?.id) return

    const dirty = updateForm.formState.dirtyFields
    const payload: PartnerUpdateFormValues = {}

    if (dirty.name) payload.name = values.name
    if (dirty.phoneNumber) payload.phoneNumber = values.phoneNumber
    if (dirty.logo) payload.logo = values.logo
    if (dirty.webhookUrl) payload.webhookUrl = values.webhookUrl
    if (dirty.pickupAddress && Object.keys(dirty.pickupAddress).length > 0) {
      payload.pickupAddress = values.pickupAddress
    }

    const buildRes = buildPartnerUpdateInput(payload)
    if (!buildRes.ok) {
      setValidationErrors(buildRes.errors)
      return
    }

    try {
      await updatePartner({ id: partner.id, data: buildRes.value }).unwrap()
      toast({ title: 'Restaurant updated successfully' })
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Failed to update restaurant',
        description: err?.message || 'An error occurred while updating the restaurant.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New Restaurant' : 'Edit Restaurant'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Issue a restaurant login and set its initial pickup location.'
              : `Update details for ${partner?.name || 'this restaurant'}.`}
          </DialogDescription>
        </DialogHeader>

        {validationErrors.length > 0 ? (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm space-y-1">
            {validationErrors.map((err, idx) => (
              <p key={idx}>• {err}</p>
            ))}
          </div>
        ) : null}

        {createdPasswordNotice ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-md text-sm">
              <p className="font-semibold">Credentials Created</p>
              <p>{createdPasswordNotice}</p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setCreatedPasswordNotice(null)
                  onOpenChange(false)
                  createForm.reset()
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : mode === 'create' ? (
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restaurant name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Souvlaki tou Nikou" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. +30 24210 12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Login email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="e.g. nikou@volos.test" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="At least 8 characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <PickupAddressFields form={createForm} />

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Restaurant
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(handleUpdateSubmit)} className="space-y-4">
              <FormField
                control={updateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restaurant name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Souvlaki tou Nikou" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. +30 24210 12345" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
                name="webhookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <PickupAddressFields form={updateForm} />

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
