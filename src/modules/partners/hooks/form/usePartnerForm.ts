import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
// TFunction is the type of t, so the schema builders below can take it as a parameter.
import type { TFunction } from 'i18next'
import type { PartnerCreateFormValues, PartnerUpdateFormValues, PickupAddressFormValues } from '@/utils/partnerFormInput'

const addressSchema = z.object({
  street: z.string().default(''),
  houseNumber: z.string().default(''),
  city: z.string().default(''),
  state: z.string().default(''),
  zipCode: z.string().default(''),
  countryCode: z.string().default(''),
  latitude: z.string().default(''),
  longitude: z.string().default(''),
})

// The schemas are built with t, so a field's message is in the reader's language (spec 0054). The
// shared FormMessage shows `error.message` as it is, so the words have to be ready in the schema.
// A message already on screen stays in its language until the field is checked again.
const createSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(1, { message: t('partners.validation.nameRequired') }),
    phoneNumber: z.string().optional().default(''),
    usualPrepMinutes: z.string().optional().default('15'),
    email: z.string().min(1, { message: t('partners.validation.emailRequired') }),
    password: z.string().min(8, { message: t('partners.validation.passwordMin') }),
    pickupAddress: addressSchema,
  })

const updateSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(1, { message: t('partners.validation.nameEmpty') }),
    phoneNumber: z.string().optional().default(''),
    logo: z.string().optional().default(''),
    webhookUrl: z.string().optional().default(''),
    usualPrepMinutes: z.string().optional().default(''),
    pickupAddress: addressSchema,
  })

export const defaultPickupAddressValues: PickupAddressFormValues = {
  street: '',
  houseNumber: '',
  city: '',
  state: '',
  zipCode: '',
  countryCode: 'GR',
  latitude: '',
  longitude: '',
}

// React Hook Form setup for creating a new partner/restaurant account.
export const usePartnerCreateForm = () => {
  const { t } = useTranslation()
  // useMemo makes the resolver again only when the language (and so t) changes. React Hook Form reads
  // its options on every render, so the new resolver is the one it uses from then on.
  const resolver = useMemo(() => zodResolver(createSchema(t)), [t])
  return useForm<PartnerCreateFormValues>({
    mode: 'onTouched',
    resolver,
    defaultValues: {
      name: '',
      phoneNumber: '',
      // Spec 0023: a new restaurant starts at 15 minutes, the backend's default.
      usualPrepMinutes: '15',
      email: '',
      password: '',
      pickupAddress: defaultPickupAddressValues,
    },
  })
}

// React Hook Form setup for editing an existing partner/restaurant account.
export const usePartnerUpdateForm = (defaultValues?: Partial<PartnerUpdateFormValues>) => {
  const { t } = useTranslation()
  // Made again only when the language changes, as in usePartnerCreateForm.
  const resolver = useMemo(() => zodResolver(updateSchema(t)), [t])
  return useForm<PartnerUpdateFormValues>({
    mode: 'onTouched',
    resolver,
    defaultValues: {
      name: defaultValues?.name ?? '',
      phoneNumber: defaultValues?.phoneNumber ?? '',
      logo: defaultValues?.logo ?? '',
      webhookUrl: defaultValues?.webhookUrl ?? '',
      usualPrepMinutes: defaultValues?.usualPrepMinutes ?? '',
      pickupAddress: defaultValues?.pickupAddress ?? defaultPickupAddressValues,
    },
  })
}
