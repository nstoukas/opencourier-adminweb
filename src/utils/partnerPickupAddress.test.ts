import {
  buildPickupFormattedAddress,
  formatPickupAddressForDisplay,
  mapLocationToPickupFormValues,
} from './partnerPickupAddress'
import type { LocationAdminDto } from '../backend-admin-sdk/src/models'

// Fixture matching opencourier-backend/scripts/seedPartnerPickupLocation.ts
const volosFixtureLocation = {
  id: 'loc_volos_1',
  street: 'Ermou',
  houseNumber: '120',
  city: 'Volos',
  state: 'Thessaly',
  zipCode: '38221',
  countryCode: 'GR' as any,
  latitude: 39.3628,
  longitude: 22.9435,
  formattedAddress: 'Ermou 120, Volos, Thessaly, 38221 GR',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  stateCode: null,
} as unknown as LocationAdminDto

describe('partnerPickupAddress utilities', () => {
  describe('buildPickupFormattedAddress', () => {
    it('formats a complete address input into a formatted address string matching request-web format', () => {
      const formatted = buildPickupFormattedAddress({
        street: 'Ermou',
        houseNumber: '120',
        city: 'Volos',
        state: 'Thessaly',
        zipCode: '38221',
        countryCode: 'GR',
      })

      // Assert literal match with opencourier-request-web buildManualRequestFormattedAddress
      expect(formatted).toBe('Ermou 120, Volos, Thessaly, 38221 GR')
    })

    it('avoids duplicating house number if street already starts with it', () => {
      const formatted = buildPickupFormattedAddress({
        street: '120 Ermou',
        houseNumber: '120',
        city: 'Volos',
        state: 'Thessaly',
        zipCode: '38221',
        countryCode: 'GR',
      })

      expect(formatted).toBe('120 Ermou, Volos, Thessaly, 38221 GR')
    })

    it('handles missing state and zipCode cleanly without dangling commas', () => {
      const formatted = buildPickupFormattedAddress({
        street: 'Ermou',
        houseNumber: '120',
        city: 'Volos',
        state: null,
        zipCode: '',
        countryCode: 'GR',
      })

      expect(formatted).toBe('Ermou 120, Volos, GR')
    })
  })

  describe('formatPickupAddressForDisplay', () => {
    it('returns stored formattedAddress verbatim when set', () => {
      const customLocation: LocationAdminDto = {
        ...volosFixtureLocation,
        formattedAddress: 'Custom Stored Address Line',
      }

      expect(formatPickupAddressForDisplay(customLocation)).toBe('Custom Stored Address Line')
    })

    it('returns em dash "—" when location is null or empty', () => {
      expect(formatPickupAddressForDisplay(null)).toBe('—')
    })
  })

  describe('mapLocationToPickupFormValues', () => {
    it('maps location DTO fields to string form values without precision loss', () => {
      const formValues = mapLocationToPickupFormValues(volosFixtureLocation)

      // Single toEqual asserting exact string values for all form fields
      expect(formValues).toEqual({
        street: 'Ermou',
        houseNumber: '120',
        city: 'Volos',
        state: 'Thessaly',
        zipCode: '38221',
        countryCode: 'GR',
        latitude: '39.3628',
        longitude: '22.9435',
      })
    })

    it('returns default empty string fields and countryCode "GR" when location is null', () => {
      // Form must hold countryCode: 'GR' when location is null so form value matches dropdown display
      const formValues = mapLocationToPickupFormValues(null)

      expect(formValues).toEqual({
        street: '',
        houseNumber: '',
        city: '',
        state: '',
        zipCode: '',
        countryCode: 'GR',
        latitude: '',
        longitude: '',
      })
    })

    it('preserves non-GR countryCode verbatim from stored location', () => {
      // Proves removing redundant nullish coalesce does not hard-code GR for existing non-GR locations
      const usLocation = {
        ...volosFixtureLocation,
        countryCode: 'US' as any,
      }
      const formValues = mapLocationToPickupFormValues(usLocation)

      expect(formValues.countryCode).toBe('US')
    })
  })
})
