import React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { useLoadScript } from '@react-google-maps/api'
import { CaretUpDown } from '@phosphor-icons/react'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
} from '@/admin-web-components'
import { PlacesAutocomplete } from '@/components/places-autocomplete'
import { transformAddress } from '@/ui-shared-utils/utils/address'
import { EnumCountryCodeAdmin } from '@/backend-admin-sdk'
import { useTranslation } from 'react-i18next'

const libraries: ('places')[] = ['places']

interface PickupAddressFieldsProps {
  form: UseFormReturn<any>
}

// Form section for editing a restaurant's single pickup address and geographic coordinates.
export const PickupAddressFields: React.FC<PickupAddressFieldsProps> = ({ form }) => {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  })

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
      <h4 className="font-semibold text-sm">{t('partners.pickup.heading')}</h4>

      {isLoaded && apiKey ? (
        <FormItem className="grid gap-1">
          <FormLabel>{t('partners.pickup.searchLabel')}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {t('partners.pickup.searchButton')}
                  <CaretUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <PlacesAutocomplete
                setSelected={(selected) => {
                  if (typeof selected === 'string') return
                  const transformed = transformAddress(selected)
                  if (transformed) {
                    // transformAddress builds addressLine1 as `${streetNumber} ${route}`, so it
                    // is always a string — but either half may be missing, which is what the
                    // literal "undefined" this strips out comes from.
                    const streetVal = transformed.addressLine1.replace(/undefined\s*/g, '').trim() || ''
                    form.setValue('pickupAddress.street', streetVal, { shouldValidate: true })
                    form.setValue('pickupAddress.city', transformed.locality || '', { shouldValidate: true })
                    form.setValue('pickupAddress.state', transformed.administrativeDistrictLevel1 || '', { shouldValidate: true })
                    form.setValue('pickupAddress.zipCode', transformed.postalCode || '', { shouldValidate: true })
                    if (transformed.country) {
                      form.setValue('pickupAddress.countryCode', transformed.country.toUpperCase(), { shouldValidate: true })
                    }
                    // transformAddress returns early unless geometry.location exists, so by
                    // here both coordinates are numbers.
                    form.setValue('pickupAddress.latitude', String(transformed.latitude), { shouldValidate: true })
                    form.setValue('pickupAddress.longitude', String(transformed.longitude), { shouldValidate: true })
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </FormItem>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="pickupAddress.street"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partners.pickup.street')}</FormLabel>
              <FormControl>
                <Input placeholder={t('partners.pickup.streetPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pickupAddress.houseNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partners.pickup.houseNumber')}</FormLabel>
              <FormControl>
                <Input placeholder={t('partners.pickup.houseNumberPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="pickupAddress.city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partners.pickup.city')}</FormLabel>
              <FormControl>
                <Input placeholder={t('partners.pickup.cityPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pickupAddress.state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partners.pickup.state')}</FormLabel>
              <FormControl>
                <Input placeholder={t('partners.pickup.statePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="pickupAddress.zipCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partners.pickup.zipCode')}</FormLabel>
              <FormControl>
                <Input placeholder={t('partners.pickup.zipCodePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pickupAddress.countryCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partners.pickup.country')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || 'GR'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('partners.pickup.countryPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(EnumCountryCodeAdmin).map(([label, code]) => (
                    <SelectItem key={code} value={code}>
                      {code} ({label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="pickupAddress.latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('partners.pickup.latitude')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('partners.pickup.latitudePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pickupAddress.longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('partners.pickup.longitude')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('partners.pickup.longitudePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{t('partners.pickup.matchHint')}</p>
      </div>
    </div>
  )
}
