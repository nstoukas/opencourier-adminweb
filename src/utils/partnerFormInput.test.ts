import {
  buildPickupAddressInput,
  buildPartnerCreateInput,
  buildPartnerUpdateInput,
  PickupAddressFormValues,
} from './partnerFormInput'
import { mapLocationToPickupFormValues } from './partnerPickupAddress'

describe('partnerFormInput utilities', () => {
  describe('buildPickupAddressInput', () => {
    it('returns value: undefined when address block is completely empty or undefined', () => {
      expect(buildPickupAddressInput(undefined)).toEqual({ ok: true, value: undefined })
      const emptyFormValues: PickupAddressFormValues = {
        street: '',
        houseNumber: '',
        city: '',
        state: '',
        zipCode: '',
        countryCode: '',
        latitude: '',
        longitude: '',
      }
      expect(buildPickupAddressInput(emptyFormValues)).toEqual({ ok: true, value: undefined })
    })

    it('treats a form block holding only a default countryCode as no address', () => {
      // mapLocationToPickupFormValues(null) returns blank fields with countryCode: 'GR'
      const nullLocationValues = mapLocationToPickupFormValues(null)
      expect(buildPickupAddressInput(nullLocationValues)).toEqual({ ok: true, value: undefined })
    })

    it('accepts filled address fields keeping default countryCode GR without explicit dropdown change', () => {
      // Admin fills street, houseNumber, city, lat/lng on a null-address partner without touching country dropdown
      const formValues: PickupAddressFormValues = {
        ...mapLocationToPickupFormValues(null),
        street: 'Ermou',
        houseNumber: '120',
        city: 'Volos',
        latitude: '39.3628',
        longitude: '22.9435',
      }

      const res = buildPickupAddressInput(formValues)
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.value?.countryCode).toBe('GR')
        expect(res.value?.formattedAddress).toBe('Ermou 120, Volos, GR')
      }
    })

    it('returns ok: false listing missing required fields when address is partially filled', () => {
      const partialFormValues: PickupAddressFormValues = {
        street: 'Ermou',
        houseNumber: '120',
        city: '',
        state: '',
        zipCode: '',
        countryCode: '',
        latitude: '',
        longitude: '',
      }

      const res = buildPickupAddressInput(partialFormValues)
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.errors.length).toBe(4)
        expect(res.errors[0]).toContain('City')
        expect(res.errors[1]).toContain('Country code')
        expect(res.errors[2]).toContain('Latitude')
        expect(res.errors[3]).toContain('Longitude')
      }
    })

    it('returns complete PickupAddressAdminInput with numbers and formatted address for valid input', () => {
      const validFormValues: PickupAddressFormValues = {
        street: 'Ermou',
        houseNumber: '120',
        city: 'Volos',
        state: 'Thessaly',
        zipCode: '38221',
        countryCode: 'GR',
        latitude: '39.3628',
        longitude: '22.9435',
      }

      const res = buildPickupAddressInput(validFormValues)
      expect(res).toEqual({
        ok: true,
        value: {
          street: 'Ermou',
          houseNumber: '120',
          city: 'Volos',
          state: 'Thessaly',
          zipCode: '38221',
          countryCode: 'GR',
          latitude: 39.3628,
          longitude: 22.9435,
          formattedAddress: 'Ermou 120, Volos, Thessaly, 38221 GR',
        },
      })
    })

    it('validates numeric bounds for latitude and longitude', () => {
      const invalidLat: PickupAddressFormValues = {
        street: 'Ermou',
        houseNumber: '120',
        city: 'Volos',
        state: '',
        zipCode: '',
        countryCode: 'GR',
        latitude: '95',
        longitude: '22.9435',
      }
      const resLat = buildPickupAddressInput(invalidLat)
      expect(resLat.ok).toBe(false)
      if (!resLat.ok) {
        expect(resLat.errors[0]).toContain('Latitude')
      }

      const invalidLng: PickupAddressFormValues = {
        street: 'Ermou',
        houseNumber: '120',
        city: 'Volos',
        state: '',
        zipCode: '',
        countryCode: 'GR',
        latitude: '39.3628',
        longitude: 'abc',
      }
      const resLng = buildPickupAddressInput(invalidLng)
      expect(resLng.ok).toBe(false)
      if (!resLng.ok) {
        expect(resLng.errors[0]).toContain('Longitude')
      }
    })

    it('rejects country codes not present in the backend EnumCountryCodeAdmin', () => {
      const invalidCountry: PickupAddressFormValues = {
        street: 'Ermou',
        houseNumber: '120',
        city: 'Volos',
        state: '',
        zipCode: '',
        countryCode: 'FR',
        latitude: '39.3628',
        longitude: '22.9435',
      }

      const res = buildPickupAddressInput(invalidCountry)
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.errors[0]).toContain('Invalid country code "FR"')
      }
    })
  })

  describe('buildPartnerCreateInput', () => {
    it('validates password length requiring at least 8 characters', () => {
      const shortPw = buildPartnerCreateInput({
        name: 'Nosh Restaurant',
        email: 'nosh@volos.test',
        password: 'short',
      })
      expect(shortPw.ok).toBe(false)

      const validPw = buildPartnerCreateInput({
        name: 'Nosh Restaurant',
        email: 'nosh@volos.test',
        password: 'longenough',
      })
      expect(validPw.ok).toBe(true)
    })

    it('rejects empty or whitespace-only restaurant name', () => {
      const emptyName = buildPartnerCreateInput({
        name: '   ',
        email: 'nosh@volos.test',
        password: 'longenough',
      })
      expect(emptyName.ok).toBe(false)
    })
  })

  describe('buildPartnerUpdateInput', () => {
    it('omits untouched fields from update payload when only name is modified', () => {
      const res = buildPartnerUpdateInput({ name: 'X' })
      expect(res).toEqual({
        ok: true,
        value: { name: 'X' },
      })
    })

    it('sends null rather than empty string when clearing phone number', () => {
      const res = buildPartnerUpdateInput({ phoneNumber: '' })
      expect(res).toEqual({
        ok: true,
        value: { phoneNumber: null },
      })
    })
  })
})
