import React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { useLoadScript } from '@react-google-maps/api'
import { ChevronsUpDown } from 'lucide-react'
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

const libraries: ('places')[] = ['places']

interface PickupAddressFieldsProps {
  form: UseFormReturn<any>
}

// Form section for editing a restaurant's single pickup address and geographic coordinates.
export const PickupAddressFields: React.FC<PickupAddressFieldsProps> = ({ form }) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  })

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
      <h4 className="font-semibold text-sm">Pickup Location & Address</h4>

      {isLoaded && apiKey ? (
        <FormItem className="grid gap-1">
          <FormLabel>Search Places Autocomplete</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  Search an address to pre-fill
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <PlacesAutocomplete
                setSelected={(selected) => {
                  if (typeof selected === 'string') return
                  const transformed = transformAddress(selected)
                  if (transformed) {
                    const streetVal = transformed.addressLine1?.replace(/undefined\s*/g, '').trim() || ''
                    form.setValue('pickupAddress.street', streetVal, { shouldValidate: true })
                    form.setValue('pickupAddress.city', transformed.locality || '', { shouldValidate: true })
                    form.setValue('pickupAddress.state', transformed.administrativeDistrictLevel1 || '', { shouldValidate: true })
                    form.setValue('pickupAddress.zipCode', transformed.postalCode || '', { shouldValidate: true })
                    if (transformed.country) {
                      form.setValue('pickupAddress.countryCode', transformed.country.toUpperCase(), { shouldValidate: true })
                    }
                    if (transformed.latitude !== undefined) {
                      form.setValue('pickupAddress.latitude', String(transformed.latitude), { shouldValidate: true })
                    }
                    if (transformed.longitude !== undefined) {
                      form.setValue('pickupAddress.longitude', String(transformed.longitude), { shouldValidate: true })
                    }
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
              <FormLabel>Street</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Ermou" {...field} />
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
              <FormLabel>House number</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 120" {...field} />
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
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Volos" {...field} />
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
              <FormLabel>State / Region</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Thessaly" {...field} />
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
              <FormLabel>Zip / Postal code</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 38221" {...field} />
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
              <FormLabel>Country</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || 'GR'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
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
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 39.3628" {...field} />
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
                <FormLabel>Longitude</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 22.9435" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Couriers are matched by distance from this point.</p>
      </div>
    </div>
  )
}
