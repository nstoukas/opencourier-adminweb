import {
  buildPickupAddressInput,
  buildPartnerCreateInput,
  buildPartnerUpdateInput,
  parseUsualPrepMinutes,
  PickupAddressFormValues,
} from './partnerFormInput'
import { mapLocationToPickupFormValues } from './partnerPickupAddress'
import {
  PartnerAdminDtoFromJSON,
  PartnerCreateAdminInputToJSON,
  PartnerUpdateAdminInputToJSON,
} from '@/backend-admin-sdk'

// Spec 0023 (AC-9): the sentence shown when the usual prep time is not a whole number from 0 to 90.
const PREP_SENTENCE = 'The usual prep time is a whole number of minutes from 0 to 90.'

const validCreate = {
  name: 'Nosh Restaurant',
  email: 'nosh@volos.test',
  password: 'longenough',
}

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

  // Spec 0023 (AC-9): "Usual prep time (minutes)", a whole number from 0 to 90.
  describe('parseUsualPrepMinutes', () => {
    it.each([
      ['0', 0],
      ['15', 15],
      ['90', 90],
      [' 25 ', 25],
    ])('accepts %j as %d', (text, minutes) => {
      expect(parseUsualPrepMinutes(text)).toBe(minutes)
    })

    it.each(['', '   ', '91', '-1', '1.5', '15 min', 'abc', '1e1', '+5'])('refuses %j', (text) => {
      expect(parseUsualPrepMinutes(text)).toBeNull()
    })
  })

  describe('buildPartnerCreateInput usualPrepMinutes', () => {
    it('leaves usualPrepMinutes out when the box is empty, so the backend default applies', () => {
      for (const usualPrepMinutes of [undefined, '', '   ']) {
        const res = buildPartnerCreateInput({ ...validCreate, usualPrepMinutes })
        expect(res.ok).toBe(true)
        if (res.ok) expect('usualPrepMinutes' in res.value).toBe(false)
      }
    })

    it('sends a valid value as a number', () => {
      expect(buildPartnerCreateInput({ ...validCreate, usualPrepMinutes: '15' })).toEqual({
        ok: true,
        value: { ...validCreate, phoneNumber: undefined, pickupAddress: undefined, usualPrepMinutes: 15 },
      })
      const zero = buildPartnerCreateInput({ ...validCreate, usualPrepMinutes: '0' })
      expect(zero.ok && zero.value.usualPrepMinutes).toBe(0)
      const ninety = buildPartnerCreateInput({ ...validCreate, usualPrepMinutes: ' 90 ' })
      expect(ninety.ok && ninety.value.usualPrepMinutes).toBe(90)
    })

    it.each(['91', '-1', '1.5', '15 min', 'abc'])('refuses %j with the sentence', (usualPrepMinutes) => {
      expect(buildPartnerCreateInput({ ...validCreate, usualPrepMinutes })).toEqual({
        ok: false,
        errors: [PREP_SENTENCE],
      })
    })
  })

  describe('buildPartnerUpdateInput usualPrepMinutes', () => {
    it('leaves usualPrepMinutes untouched when it was not changed', () => {
      const res = buildPartnerUpdateInput({ name: 'X' })
      expect(res).toEqual({ ok: true, value: { name: 'X' } })
      if (res.ok) expect('usualPrepMinutes' in res.value).toBe(false)
    })

    it('sends a valid value as a number', () => {
      expect(buildPartnerUpdateInput({ usualPrepMinutes: '40' })).toEqual({ ok: true, value: { usualPrepMinutes: 40 } })
      expect(buildPartnerUpdateInput({ usualPrepMinutes: '0' })).toEqual({ ok: true, value: { usualPrepMinutes: 0 } })
      expect(buildPartnerUpdateInput({ usualPrepMinutes: ' 90 ' })).toEqual({ ok: true, value: { usualPrepMinutes: 90 } })
    })

    it('refuses an emptied box with the sentence, never saving it as 0', () => {
      for (const usualPrepMinutes of ['', '   ']) {
        expect(buildPartnerUpdateInput({ usualPrepMinutes })).toEqual({ ok: false, errors: [PREP_SENTENCE] })
      }
    })

    it.each(['91', '-1', '1.5', '15 min', 'abc'])('refuses %j with the sentence', (usualPrepMinutes) => {
      expect(buildPartnerUpdateInput({ name: 'X', usualPrepMinutes })).toEqual({
        ok: false,
        errors: [PREP_SENTENCE],
      })
    })
  })

  // The hand edited SDK needs both the reader and the serializer, or a save drops the value silently.
  describe('SDK usualPrepMinutes', () => {
    const partnerJson = {
      id: 'p1',
      name: 'Nosh',
      phoneNumber: null,
      logo: null,
      webhookUrl: null,
      userId: 'u1',
      email: 'nosh@volos.test',
      pickupAddress: null,
      createdAt: '2026-11-03T10:00:00.000Z',
      updatedAt: '2026-11-03T10:00:00.000Z',
    }

    it('PartnerAdminDtoFromJSON reads usualPrepMinutes', () => {
      expect(PartnerAdminDtoFromJSON({ ...partnerJson, usualPrepMinutes: 25 }).usualPrepMinutes).toBe(25)
      expect(PartnerAdminDtoFromJSON({ ...partnerJson, usualPrepMinutes: 0 }).usualPrepMinutes).toBe(0)
    })

    it('PartnerAdminDtoFromJSON defaults usualPrepMinutes to 15 when absent', () => {
      expect(PartnerAdminDtoFromJSON(partnerJson).usualPrepMinutes).toBe(15)
    })

    it('PartnerCreateAdminInputToJSON writes usualPrepMinutes', () => {
      const built = buildPartnerCreateInput({ ...validCreate, usualPrepMinutes: '30' })
      expect(built.ok).toBe(true)
      if (built.ok) expect(PartnerCreateAdminInputToJSON(built.value).usualPrepMinutes).toBe(30)
    })

    it('PartnerUpdateAdminInputToJSON writes usualPrepMinutes', () => {
      const built = buildPartnerUpdateInput({ usualPrepMinutes: '0' })
      expect(built.ok).toBe(true)
      if (built.ok) expect(PartnerUpdateAdminInputToJSON(built.value).usualPrepMinutes).toBe(0)
      expect(PartnerUpdateAdminInputToJSON({ usualPrepMinutes: 45 }).usualPrepMinutes).toBe(45)
    })
  })
})
