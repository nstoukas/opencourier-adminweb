import {
  EnumCountryCodeAdmin,
  PickupAddressAdminInput,
  PartnerCreateAdminInput,
  PartnerUpdateAdminInput,
} from '../backend-admin-sdk/src/models'
import { buildPickupFormattedAddress } from './partnerPickupAddress'

export type PickupAddressFormValues = {
  street: string
  houseNumber: string
  city: string
  state: string
  zipCode: string
  countryCode: string
  latitude: string
  longitude: string
}

export type PartnerCreateFormValues = {
  name: string
  phoneNumber?: string
  // Spec 0023: the usual prep time as typed (whole minutes, 0 to 90).
  usualPrepMinutes?: string
  email: string
  password: string
  pickupAddress?: PickupAddressFormValues
}

export type PartnerUpdateFormValues = {
  name?: string
  phoneNumber?: string | null
  logo?: string | null
  webhookUrl?: string | null
  usualPrepMinutes?: string
  pickupAddress?: PickupAddressFormValues
}

export type BuildResult<T> = { ok: true; value: T } | { ok: false; errors: string[] }

const VALID_COUNTRY_CODES: string[] = Object.values(EnumCountryCodeAdmin)

// Spec 0023 (AC-9): the usual prep time a representative may set, and the backend's own sentence.
export const USUAL_PREP_MINUTES_SENTENCE = 'The usual prep time is a whole number of minutes from 0 to 90.'

// The usual prep time as typed, as a number, or null when it is not a whole number from 0 to 90.
export function parseUsualPrepMinutes(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const minutes = Number(trimmed)
  return minutes >= 0 && minutes <= 90 ? minutes : null
}

// Validates and transforms pickup address form fields into a backend-ready PickupAddressAdminInput object.
export function buildPickupAddressInput(
  v?: PickupAddressFormValues,
): BuildResult<PickupAddressAdminInput | undefined> {
  if (!v) {
    return { ok: true, value: undefined }
  }

  const street = v.street.trim()
  const houseNumber = v.houseNumber.trim()
  const city = v.city.trim()
  const state = v.state.trim()
  const zipCode = v.zipCode.trim()
  const countryCode = v.countryCode.trim().toUpperCase()
  const rawLat = v.latitude.trim()
  const rawLng = v.longitude.trim()

  // The Country dropdown always holds a value (it defaults to GR), so a country code on its
  // own never means the admin is adding an address — judge emptiness on the other fields.
  const isEmpty = !street && !houseNumber && !city && !state && !zipCode && !rawLat && !rawLng

  if (isEmpty) {
    return { ok: true, value: undefined }
  }

  const errors: string[] = []

  if (!street) {
    errors.push('Street is required when adding a pickup address')
  }
  if (!city) {
    errors.push('City is required when adding a pickup address')
  }
  if (!countryCode) {
    errors.push('Country code is required when adding a pickup address')
  } else if (!VALID_COUNTRY_CODES.includes(countryCode)) {
    errors.push(`Invalid country code "${countryCode}". Allowed codes: ${VALID_COUNTRY_CODES.join(', ')}`)
  }

  let latNum: number | undefined
  if (!rawLat) {
    errors.push('Latitude is required when adding a pickup address')
  } else {
    latNum = Number(rawLat)
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      errors.push(`Latitude must be a valid number between -90 and 90 (got "${rawLat}")`)
    }
  }

  let lngNum: number | undefined
  if (!rawLng) {
    errors.push('Longitude is required when adding a pickup address')
  } else {
    lngNum = Number(rawLng)
    if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      errors.push(`Longitude must be a valid number between -180 and 180 (got "${rawLng}")`)
    }
  }

  // The two `=== undefined` tests are how TypeScript learns what the branches above already
  // guarantee: every path that leaves a coordinate unset also pushes an error. Without them
  // it cannot narrow latNum/lngNum to `number` for the returned value below.
  if (errors.length > 0 || latNum === undefined || lngNum === undefined) {
    return { ok: false, errors }
  }

  const formattedAddress = buildPickupFormattedAddress({
    street,
    houseNumber: houseNumber || undefined,
    city,
    state: state || undefined,
    zipCode: zipCode || undefined,
    countryCode,
  })

  return {
    ok: true,
    value: {
      street,
      houseNumber: houseNumber || undefined,
      city,
      state: state || undefined,
      zipCode: zipCode || undefined,
      countryCode: countryCode as EnumCountryCodeAdmin,
      latitude: latNum,
      longitude: lngNum,
      formattedAddress: formattedAddress || undefined,
    },
  }
}

// Validates restaurant creation form input before submitting to the admin API.
export function buildPartnerCreateInput(v: PartnerCreateFormValues): BuildResult<PartnerCreateAdminInput> {
  const errors: string[] = []

  const name = v.name.trim()
  if (!name) {
    errors.push('Restaurant name is required')
  }

  const email = v.email.trim()
  if (!email || !email.includes('@')) {
    errors.push('A valid email address containing "@" is required')
  }

  const password = v.password
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  let pickupAddress: PickupAddressAdminInput | undefined
  if (v.pickupAddress) {
    const addressRes = buildPickupAddressInput(v.pickupAddress)
    if (!addressRes.ok) {
      errors.push(...addressRes.errors)
    } else {
      pickupAddress = addressRes.value
    }
  }

  // Left empty, the backend's default (15) applies.
  let usualPrepMinutes: number | undefined
  if (v.usualPrepMinutes !== undefined && v.usualPrepMinutes.trim() !== '') {
    const parsed = parseUsualPrepMinutes(v.usualPrepMinutes)
    if (parsed === null) errors.push(USUAL_PREP_MINUTES_SENTENCE)
    else usualPrepMinutes = parsed
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      name,
      email,
      password,
      phoneNumber: v.phoneNumber?.trim() || undefined,
      pickupAddress,
      ...(usualPrepMinutes !== undefined && { usualPrepMinutes }),
    },
  }
}

// Validates restaurant update form input before submitting to the admin API.
export function buildPartnerUpdateInput(v: PartnerUpdateFormValues): BuildResult<PartnerUpdateAdminInput> {
  const errors: string[] = []
  const result: PartnerUpdateAdminInput = {}

  if (v.name !== undefined) {
    const trimmedName = v.name.trim()
    if (!trimmedName) {
      errors.push('Restaurant name cannot be empty')
    } else {
      result.name = trimmedName
    }
  }

  if (v.phoneNumber !== undefined) {
    result.phoneNumber = v.phoneNumber === null || !v.phoneNumber.trim() ? null : v.phoneNumber.trim()
  }

  if (v.logo !== undefined) {
    result.logo = v.logo === null || !v.logo.trim() ? null : v.logo.trim()
  }

  if (v.webhookUrl !== undefined) {
    result.webhookUrl = v.webhookUrl === null || !v.webhookUrl.trim() ? null : v.webhookUrl.trim()
  }

  // Spec 0023 (AC-9): an emptied box is refused, never saved as 0.
  if (v.usualPrepMinutes !== undefined) {
    const parsed = parseUsualPrepMinutes(v.usualPrepMinutes)
    if (parsed === null) errors.push(USUAL_PREP_MINUTES_SENTENCE)
    else result.usualPrepMinutes = parsed
  }

  if (v.pickupAddress !== undefined) {
    const addressRes = buildPickupAddressInput(v.pickupAddress)
    if (!addressRes.ok) {
      errors.push(...addressRes.errors)
    } else {
      result.pickupAddress = addressRes.value
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: result,
  }
}
