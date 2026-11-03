import React, { useState, useEffect } from 'react'
import { CheckCircle, Copy } from '@phosphor-icons/react'
import {
  Alert,
  AlertDescription,
  Button,
  DetailList,
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
  Spinner,
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
  // The button that opened the dialog: Radix does not give it focus back here, so we do.
  returnFocusTo?: React.RefObject<HTMLElement>
}

// What the Restaurant Added panel shows (spec 0024, AC-8): the name from the server's answer and
// the email and password the admin just typed. Held only in this dialog's state.
interface CreatedRestaurant {
  name: string
  email: string
  password: string
}

// Whether Copy All worked: "Copied" until the dialog closes, or a line saying to select the text.
type CopyState = 'idle' | 'copied' | 'failed'

// The restaurant dialogs (spec 0024): Add a Restaurant, then Restaurant Added; and Edit Details.
// The requests they send are the same as before the redesign (AC-7, AC-9).
export const PartnerFormDialog: React.FC<PartnerFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  partner,
  returnFocusTo,
}) => {
  const { toast } = useToast()
  const [createPartner, { isLoading: isCreating }] = useCreatePartnerMutation()
  const [updatePartner, { isLoading: isUpdating }] = useUpdatePartnerMutation()
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [created, setCreated] = useState<CreatedRestaurant | null>(null)
  const [copyState, setCopyState] = useState<CopyState>('idle')

  const createForm = usePartnerCreateForm()
  const updateForm = usePartnerUpdateForm()

  const isLoading = isCreating || isUpdating

  useEffect(() => {
    if (open) {
      setValidationErrors([])
      setCreated(null)
      setCopyState('idle')
      if (mode === 'update' && partner) {
        updateForm.reset({
          // Partner.name is a required column in Prisma, so unlike the three fields below
          // it never arrives null — the others are all `String?`.
          name: partner.name,
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
    setCreated(null)

    const buildRes = buildPartnerCreateInput(values)
    if (!buildRes.ok) {
      setValidationErrors(buildRes.errors)
      return
    }

    try {
      const saved = await createPartner(buildRes.value).unwrap()
      // No toast: the Restaurant Added panel is the confirmation (spec 0024, AC-8).
      // The SDK's nullability is unreliable here, so the typed name stands in if the answer lacks one.
      setCreated({ name: saved.name || buildRes.value.name, email: buildRes.value.email, password: buildRes.value.password })
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

  // Copy All: both lines at once, so nothing gets mistyped. The clipboard can be missing (plain
  // http away from localhost) or refuse; then the values stay on screen to select by hand.
  const copyAll = async () => {
    if (!created) return
    try {
      // The DOM types say the clipboard always exists, but browsers leave it out on insecure pages:
      // then this line throws a TypeError, which the catch below turns into the "select" line.
      await navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}`)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  // The title and description stay the same while the dialog animates closed, because `created`
  // is only cleared after the close (onCloseAutoFocus) or on the next open (adminweb AGENTS.md).
  const title = created ? 'Restaurant Added' : mode === 'create' ? 'Add a Restaurant' : 'Edit Details'
  const description = created
    ? 'Give these details to the restaurant.'
    : mode === 'create'
      ? 'Issue a restaurant login and set its pickup location.'
      : `Update details for ${partner?.name || 'this restaurant'}.`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl max-h-[90vh] overflow-y-auto"
        // The Restaurant Added panel is the only time the password is shown, so only Done closes
        // it: Escape and a click outside do nothing there (spec 0024, AC-8).
        onEscapeKeyDown={(event) => {
          if (created) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (created) event.preventDefault()
        }}
        onCloseAutoFocus={(event) => {
          // Forget the password once the dialog has closed, and give focus back to its button.
          setCreated(null)
          setCopyState('idle')
          if (returnFocusTo?.current) {
            event.preventDefault()
            returnFocusTo.current.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {validationErrors.length > 0 ? (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm space-y-1">
            {validationErrors.map((err, idx) => (
              <p key={idx}>• {err}</p>
            ))}
          </div>
        ) : null}

        {created ? (
          <div className="space-y-4">
            <Alert variant="success">
              <CheckCircle aria-hidden="true" className="h-4 w-4" />
              <AlertDescription>
                {created.name} can start sending deliveries. Give them these details. The password is shown only now.
              </AlertDescription>
            </Alert>
            <DetailList
              items={[
                { label: 'Email', value: created.email, mono: true },
                { label: 'Password', value: created.password, mono: true },
              ]}
            />
            {copyState === 'failed' ? (
              <p className="text-sm text-destructive" role="status">
                Could not copy. Select the text instead.
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={copyAll}>
                <Copy aria-hidden="true" className="mr-2 h-4 w-4" />
                {copyState === 'copied' ? 'Copied' : 'Copy All'}
              </Button>
              <Button type="button" onClick={() => onOpenChange(false)}>
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
                    <FormLabel>Phone couriers call</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. +30 24210 12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <PickupAddressFields form={createForm} />

              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sign-in email</FormLabel>
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

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Spinner className="mr-2" /> : null}
                  Add Restaurant
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
                    <FormLabel>Phone couriers call</FormLabel>
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
                  {isLoading ? <Spinner className="mr-2" /> : null}
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
