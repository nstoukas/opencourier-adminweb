import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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

const createSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  phoneNumber: z.string().optional().default(''),
  email: z.string().min(1, { message: 'Email is required' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  pickupAddress: addressSchema,
})

const updateSchema = z.object({
  name: z.string().min(1, { message: 'Name cannot be empty' }),
  phoneNumber: z.string().optional().default(''),
  logo: z.string().optional().default(''),
  webhookUrl: z.string().optional().default(''),
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
  return useForm<PartnerCreateFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
      email: '',
      password: '',
      pickupAddress: defaultPickupAddressValues,
    },
  })
}

// React Hook Form setup for editing an existing partner/restaurant account.
export const usePartnerUpdateForm = (defaultValues?: Partial<PartnerUpdateFormValues>) => {
  return useForm<PartnerUpdateFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(updateSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      phoneNumber: defaultValues?.phoneNumber ?? '',
      logo: defaultValues?.logo ?? '',
      webhookUrl: defaultValues?.webhookUrl ?? '',
      pickupAddress: defaultValues?.pickupAddress ?? defaultPickupAddressValues,
    },
  })
}
