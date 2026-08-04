import type { LocationAdminDto } from '../backend-admin-sdk/src/models'
import type { PickupAddressFormValues } from './partnerFormInput'

// Ported from request-web buildManualRequestFormattedAddress (opencourier-request-web/src/modules/manual-request/types/index.ts:19) to format restaurant pickup addresses identically.
export function buildPickupFormattedAddress(a: {
  street?: string | null
  houseNumber?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  countryCode?: string | null
}): string {
  const street = a.street?.trim() || ''
  const houseNumber = a.houseNumber?.trim() || ''
  const city = a.city?.trim() || ''
  const state = a.state?.trim() || ''
  const zipCode = a.zipCode?.trim() || ''
  const countryCode = a.countryCode?.trim() || ''

  let streetLine = street
  if (houseNumber) {
    if (!street.toLowerCase().startsWith(houseNumber.toLowerCase())) {
      streetLine = street ? `${street} ${houseNumber}` : houseNumber
    }
  }

  const zipCountry = [zipCode, countryCode].filter(Boolean).join(' ')
  const parts = [streetLine, city, state, zipCountry].filter(Boolean)

  return parts.join(', ')
}

// Formats a LocationAdminDto for read-only display, preferring the stored formatted address.
export function formatPickupAddressForDisplay(location: LocationAdminDto | null): string {
  if (!location) {
    return '—'
  }
  if (location.formattedAddress && location.formattedAddress.trim().length > 0) {
    return location.formattedAddress.trim()
  }

  const built = buildPickupFormattedAddress(location)
  return built.length > 0 ? built : '—'
}

// Maps LocationAdminDto to string form values for pickup address form editing.
export function mapLocationToPickupFormValues(location: LocationAdminDto | null): PickupAddressFormValues {
  if (!location) {
    return {
      street: '',
      houseNumber: '',
      city: '',
      state: '',
      zipCode: '',
      // Match what the Country dropdown shows for a blank address (PickupAddressFields.tsx
      // falls back to 'GR' for display) so the value the form holds is the value the admin sees.
      countryCode: 'GR',
      latitude: '',
      longitude: '',
    }
  }

  return {
    street: location.street ?? '',
    houseNumber: location.houseNumber ?? '',
    city: location.city ?? '',
    state: location.state ?? '',
    zipCode: location.zipCode ?? '',
    countryCode: location.countryCode,
    // Prisma declares Location.longitude/latitude as non-null Float and the DTO matches, so
    // a location that exists always has coordinates — no nullish check to make here.
    latitude: String(location.latitude),
    longitude: String(location.longitude),
  }
}
